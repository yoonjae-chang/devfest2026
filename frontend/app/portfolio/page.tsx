"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Play, Pause, Star, Trash2, ChevronUp, ChevronDown, Music2, Volume2, VolumeX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { loadPortfolioItems, savePortfolioItems, type StoredPortfolioItem } from "@/lib/portfolio-storage";
import { displayNameFromFilename } from "@/lib/utils";
import { backendApi } from "@/lib/api";

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a)$/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi)$/i;

const PASTEL_COLORS = [
  "bg-sky-100",
  "bg-blue-100",
  "bg-indigo-100",
  "bg-violet-100",
  "bg-slate-200",
  "bg-cyan-100",
  "bg-sky-200",
  "bg-blue-200",
  "bg-teal-100",
  "bg-slate-100",
];

interface PublishItem {
  id: string;
  file: File;
  colorClass: string;
  title: string;
  duration: number | null;
  featured: boolean;
  description: string;
  lyrics: string;
  cover_image_url?: string;
}

function filterFiles(fileList: FileList | File[]): File[] {
  // Accept all file types
  return Array.from(fileList);
}

function isAudioFile(file: File): boolean {
  return AUDIO_EXT.test(file.name);
}

function isImageFile(file: File): boolean {
  return IMAGE_EXT.test(file.name);
}

function isVideoFile(file: File): boolean {
  return VIDEO_EXT.test(file.name);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toUpperCase();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function storedToPublish(s: StoredPortfolioItem): PublishItem {
  const file = new File([s.blob], s.fileName, {
    type: s.blob.type,
    lastModified: s.fileLastModified,
  });
  return {
    id: s.id,
    file,
    colorClass: s.colorClass,
    title: s.title,
    duration: s.duration,
    featured: s.featured,
    description: s.description,
    lyrics: s.lyrics || "",
    cover_image_url: s.cover_image_url,
  };
}

function publishToStored(p: PublishItem): StoredPortfolioItem {
  return {
    id: p.id,
    colorClass: p.colorClass,
    title: p.title,
    duration: p.duration,
    featured: p.featured,
    description: p.description,
    lyrics: p.lyrics || "",
    blob: p.file,
    fileName: p.file.name,
    fileSize: p.file.size,
    fileLastModified: p.file.lastModified,
    cover_image_url: p.cover_image_url,
  };
}

function PortfolioPageContent() {
  const [items, setItems] = useState<PublishItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [tempLyrics, setTempLyrics] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset lyrics editing state when modal closes
  useEffect(() => {
    if (!detailItemId) {
      setEditingLyrics(false);
    }
  }, [detailItemId]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();

  // Load portfolio items from IndexedDB (no server, no auth)
  const hasLoadedRef = useRef(false);
  const loadCompleteRef = useRef(false);
  const skipNextPersistRef = useRef(false);
  const refreshFromStorage = useCallback(() => {
    loadPortfolioItems()
      .then((stored) => {
        const parsed = stored.map(storedToPublish);
        skipNextPersistRef.current = true; // Don't persist what we just loaded
        loadCompleteRef.current = true;
        setItems(parsed);
      })
      .catch(() => {
        loadCompleteRef.current = true;
      });
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    refreshFromStorage();
  }, [refreshFromStorage]);

  // After publishing from Studio (?published=1), refetch then clean URL
  useEffect(() => {
    if (searchParams.get("published") !== "1") return;
    const t = setTimeout(() => {
      refreshFromStorage();
      window.history.replaceState({}, "", "/portfolio");
    }, 300);
    return () => clearTimeout(t);
  }, [searchParams, refreshFromStorage]);

  // When returning to tab, refetch so published items from Studio show up
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshFromStorage();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshFromStorage]);

  // Persist only when user edits — never before load completes, never right after load
  // Debounce saves to avoid too many API calls while user is typing
  useEffect(() => {
    if (!loadCompleteRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const stored = items.map(publishToStored);
    // Debounce: wait 1 second after last change before saving
    const timeoutId = setTimeout(() => {
      savePortfolioItems(stored).catch((error) => {
        console.error("Failed to save portfolio items:", error);
      });
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [items]);

  // Load duration for audio items that don't have it yet
  useEffect(() => {
    const needDuration = items.filter((i) => i.duration === null && isAudioFile(i.file));
    if (needDuration.length === 0) return;
    let cancelled = false;
    needDuration.forEach((item) => {
      const url = URL.createObjectURL(item.file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        if (cancelled) return;
        const d = audio.duration;
        URL.revokeObjectURL(url);
        setItems((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, duration: d } : p))
        );
      };
      audio.onerror = () => URL.revokeObjectURL(url);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const currentTrack = items.find((i) => i.id === currentTrackId);
  const displayOrder = [...items].sort((a, b) => {
    // First sort by featured status, then by title
    const featuredDiff = Number(b.featured) - Number(a.featured);
    if (featuredDiff !== 0) return featuredDiff;
    return (a.title || displayNameFromFilename(a.file.name)).localeCompare(b.title || displayNameFromFilename(b.file.name));
  });

  const handleAddFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = filterFiles(e.target.files || []);
    if (files.length === 0) {
      e.target.value = "";
      return;
    }
    
    // Add items first without cover images
    const newItems: PublishItem[] = [];
    setItems((prev) => {
      const next = [...prev];
      for (const file of files) {
        const colorClass = PASTEL_COLORS[next.length % PASTEL_COLORS.length];
        const title = displayNameFromFilename(file.name);
        const newItem: PublishItem = {
          id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`,
          file,
          colorClass,
          title,
          duration: null,
          featured: false,
          description: "",
          lyrics: "",
        };
        next.push(newItem);
        newItems.push(newItem);
      }
      return next;
    });
    e.target.value = "";

    // Generate album covers for audio files only
    for (const item of newItems) {
      // Only generate covers for audio files
      if (!isAudioFile(item.file)) {
        // For image files, use the image itself as the cover
        if (isImageFile(item.file)) {
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, cover_image_url: URL.createObjectURL(item.file) }
                : p
            )
          );
        }
        continue;
      }
      
      try {
        // Add variation to ensure unique covers - use item ID hash and timestamp
        const variation = `${item.id.slice(0, 8)}-${Date.now()}`;
        const uniqueDescription = item.description 
          ? `${item.description} [Unique variation: ${variation}]`
          : `[Unique variation: ${variation}]`;
        
        const coverResponse = await backendApi.generateAlbumCover({
          title: item.title,
          description: uniqueDescription,
        });
        
        // Update the item with the cover image URL
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, cover_image_url: coverResponse.cover_image_url }
              : p
          )
        );
      } catch (error) {
        console.error(`Failed to generate album cover for ${item.title}:`, error);
        // Continue even if cover generation fails
      }
    }
  };

  const handlePlayClick = useCallback((item: PublishItem) => {
    // Only handle audio files for playback
    if (!isAudioFile(item.file)) {
      // For non-audio files, open detail modal or download
      setDetailItemId(item.id);
      return;
    }
    
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setCurrentTime(0);
    const url = URL.createObjectURL(item.file);
    const audio = new Audio(url);
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setPlayingId(null);
      setCurrentTime(0);
      audioRef.current = null;
    };
    audio.play().catch(() => {});
    setCurrentTrackId(item.id);
    setPlayingId(item.id);
  }, [playingId, volume, isMuted]);

  // Sync volume/mute to audio when they change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const duration = currentTrack?.duration ?? 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || duration <= 0) return;
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(1, x)) * duration;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const toggleBarPlayPause = useCallback(() => {
    if (!currentTrack) return;
    if (playingId === currentTrack.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    handlePlayClick(currentTrack);
  }, [currentTrack, playingId, handlePlayClick]);

  const updateItem = useCallback((id: string, patch: Partial<PublishItem>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    if (currentTrackId === id) {
      setCurrentTrackId(null);
      setPlayingId(null);
      audioRef.current?.pause();
      audioRef.current = null;
    }
  }, [currentTrackId]);

  const moveItem = useCallback((id: string, direction: "up" | "down") => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i === -1) return prev;
      const j = direction === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col">
      <div className="flex-1 px-6 py-8 pb-28">
        <div className="max-w-6xl mx-auto flex flex-col h-full">
          {/* Section header + add */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Releases {items.length > 0 && <span className="text-sky-200/90 font-normal">({items.length})</span>}
            </h2>
            <input
              ref={inputRef}
              type="file"
              accept="*"
              multiple
              onChange={handleAddFile}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-6">
            {displayOrder.map((item) => {
              const { file } = item;
              const isEditingTitle = editingTitleId === item.id;
              const isEditingDesc = editingDescriptionId === item.id;
              const indexInFull = items.findIndex((i) => i.id === item.id);
              return (
                <div key={item.id} className="group flex flex-col gap-2.5">
                  <div className="relative">
                    <button
                      type="button"
                      className={`relative aspect-square rounded-2xl ${item.colorClass} flex flex-col items-center justify-center p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all text-left w-full overflow-hidden`}
                      onClick={() => {
                        if (isImageFile(item.file)) {
                          // For images, show in detail modal
                          setDetailItemId(item.id);
                        } else if (isVideoFile(item.file)) {
                          // For videos, show in detail modal
                          setDetailItemId(item.id);
                        } else {
                          // For audio, handle playback
                          handlePlayClick(item);
                        }
                      }}
                      title={isAudioFile(item.file) ? "Click to play" : "Click to view"}
                    >
                      {item.cover_image_url ? (
                        <img
                          src={item.cover_image_url && `${item.cover_image_url}?random=${Math.random()}`}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        />
                      ) : isImageFile(item.file) ? (
                        <img
                          src={URL.createObjectURL(item.file)}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        />
                      ) : null}
                      {isAudioFile(item.file) && (
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/20 rounded-2xl pointer-events-none">
                          <Play className="w-10 h-10 text-white ml-0.5 drop-shadow-lg" />
                        </span>
                      )}
                      {isVideoFile(item.file) && (
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity bg-black/20 rounded-2xl pointer-events-none">
                          <Play className="w-10 h-10 text-white ml-0.5 drop-shadow-lg" />
                        </span>
                      )}
                    </button>
                    {item.featured && (
                      <span className="absolute top-2 right-2 rounded-full bg-sky-400/95 p-1.5 shadow-sm" title="Featured">
                        <Star className="w-4 h-4 text-sky-900" fill="currentColor" />
                      </span>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end gap-1">
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          className="p-1.5 rounded-md bg-white/90 text-gray-700 shadow-sm transition-colors"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="relative min-h-[2.5rem]">
                    {isEditingTitle ? (
                      <Input
                        value={item.title}
                        onChange={(e) => updateItem(item.id, { title: e.target.value })}
                        onBlur={() => setEditingTitleId(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingTitleId(null)}
                        className="text-sm font-medium h-8 text-white bg-white/10 border-white/30 placeholder:text-white/50"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitleId(item.id)}
                        className="text-sm font-medium text-white truncate pr-1 w-full text-left rounded"
                      >
                        {item.title || displayNameFromFilename(file.name)}
                      </button>
                    )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

          {items.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
              <div className="rounded-2xl border border-white/15 bg-black/30 shadow-xl p-8 max-w-sm backdrop-blur-md">
                <div className="rounded-full bg-white/20 p-5 mb-5 inline-flex">
                  <Music2 className="w-10 h-10 text-sky-200" />
                </div>
                <p className="text-white font-semibold">Your portfolio is empty</p>
                <p className="text-sm text-sky-100/80 mt-2">
                  Add your first release to showcase your work. Upload any file to get started.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-6 px-5 py-2.5 rounded-full bg-sky-400/90 text-white text-sm font-medium active:scale-[0.98] transition-all shadow-sm"
                >
                  Add your first release
                </button>
              </div>
            </div>
          )}

      {currentTrack && isAudioFile(currentTrack.file) && (
        <footer className="fixed bottom-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-md border-t border-white/15 text-white">
          {/* Progress bar - full width */}
          <div
            ref={progressBarRef}
            role="progressbar"
            aria-valuenow={duration > 0 ? (currentTime / duration) * 100 : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-1 w-full cursor-pointer bg-white/20 transition-[height]"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-sky-400 transition-[width] duration-75 rounded-r"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-400 opacity-0 shadow-md transition-opacity pointer-events-none"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Left: track info */}
            <div className="flex items-center gap-3 min-w-0 justify-self-start">
              {currentTrack.cover_image_url ? (
                <img
                  src={currentTrack.cover_image_url}
                  alt={currentTrack.title}
                  className="flex-shrink-0 w-14 h-14 rounded-lg object-cover shadow-sm ring-1 ring-white/20 border border-white/10"
                />
              ) : (
                <div
                  className={`flex-shrink-0 w-14 h-14 rounded-lg ${currentTrack.colorClass} shadow-sm ring-1 ring-white/20 border border-white/10`}
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {currentTrack.title || displayNameFromFilename(currentTrack.file.name)}
                </p>
              </div>
            </div>

            {/* Center: play controls + time */}
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={toggleBarPlayPause}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white active:scale-95 transition-all shadow-sm"
                  aria-label={playingId === currentTrack.id ? "Pause" : "Play"}
                >
                  {playingId === currentTrack.id ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-sky-200/80 tabular-nums">
                <span>{formatDuration(currentTime)}</span>
                <span>/</span>
                <span>{currentTrack.duration != null ? formatDuration(currentTrack.duration) : "0:00"}</span>
              </div>
            </div>

            {/* Right: volume */}
            <div className="flex items-center gap-2 justify-self-end min-w-0 max-w-[140px]">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-1.5 rounded-full text-sky-200/80 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (v > 0) setIsMuted(false);
                }}
                className="w-full h-1.5 accent-sky-400 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm"
              />
            </div>
          </div>
        </footer>
      )}

      {/* Detail Modal */}
      {detailItemId && (() => {
        const detailItem = items.find((i) => i.id === detailItemId);
        if (!detailItem) return null;
        
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setDetailItemId(null);
              setEditingLyrics(false);
            }}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative h-64 sm:h-80 overflow-hidden">
                {isImageFile(detailItem.file) ? (
                  <img
                    src={URL.createObjectURL(detailItem.file)}
                    alt={detailItem.title}
                    className="w-full h-full object-contain bg-gray-800"
                  />
                ) : isVideoFile(detailItem.file) ? (
                  <video
                    src={URL.createObjectURL(detailItem.file)}
                    className="w-full h-full object-contain bg-gray-800"
                    controls
                  />
                ) : detailItem.cover_image_url ? (
                  <img
                    src={detailItem.cover_image_url}
                    alt={detailItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full ${detailItem.colorClass}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                <button
                  type="button"
                  onClick={() => {
                    setDetailItemId(null);
                    setEditingLyrics(false);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white transition-colors z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                    {detailItem.title || displayNameFromFilename(detailItem.file.name)}
                  </h2>
                  {detailItem.duration != null && isAudioFile(detailItem.file) && (
                    <p className="text-white/70 text-sm mt-1">
                      {formatDuration(detailItem.duration)}
                    </p>
                  )}
                  {!isAudioFile(detailItem.file) && (
                    <p className="text-white/70 text-sm mt-1">
                      {formatSize(detailItem.file.size)} • {getExtension(detailItem.file.name)}
                    </p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  {editingDescriptionId === detailItem.id ? (
                    <textarea
                      value={detailItem.description}
                      onChange={(e) => updateItem(detailItem.id, { description: e.target.value })}
                      onBlur={() => setEditingDescriptionId(null)}
                      placeholder="Add a description..."
                      className="w-full bg-gray-800 rounded-lg p-3 text-white placeholder:text-gray-400 resize-none border border-gray-700 focus:border-sky-400 focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setEditingDescriptionId(detailItem.id)}
                      className="bg-gray-800/50 rounded-lg p-4 text-gray-200 min-h-[60px] cursor-text transition-colors"
                    >
                      {detailItem.description || (
                        <span className="text-gray-500 italic">Click to add a description...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Lyrics - only for audio files */}
                {isAudioFile(detailItem.file) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Lyrics</h3>
                    {editingLyrics ? (
                      <textarea
                        value={tempLyrics}
                        onChange={(e) => setTempLyrics(e.target.value)}
                        onBlur={() => {
                          updateItem(detailItem.id, { lyrics: tempLyrics });
                          setEditingLyrics(false);
                        }}
                        placeholder="Add lyrics..."
                        className="w-full bg-gray-800 rounded-lg p-4 text-white placeholder:text-gray-400 resize-none border border-gray-700 focus:border-sky-400 focus:outline-none font-mono text-sm leading-relaxed"
                        rows={12}
                        autoFocus
                      />
                    ) : (
                      <div
                        onClick={() => {
                          setTempLyrics(detailItem.lyrics || "");
                          setEditingLyrics(true);
                        }}
                        className="bg-gray-800/50 rounded-lg p-4 text-gray-200 min-h-[200px] cursor-text transition-colors whitespace-pre-wrap font-mono text-sm leading-relaxed"
                      >
                        {detailItem.lyrics || (
                          <span className="text-gray-500 italic">Click to add lyrics...</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* File Info */}
                <div className="pt-4 border-t border-gray-700">
                  <div className="space-y-2 text-sm text-gray-400">
                    <p><span className="text-gray-500">File:</span> {detailItem.file.name}</p>
                    <p><span className="text-gray-500">Size:</span> {formatSize(detailItem.file.size)}</p>
                    <p><span className="text-gray-500">Type:</span> {detailItem.file.type || getExtension(detailItem.file.name)}</p>
                  </div>
                </div>

                {/* Play/View Button */}
                {isAudioFile(detailItem.file) && (
                  <div className="pt-4 border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        handlePlayClick(detailItem);
                        setDetailItemId(null);
                        setEditingLyrics(false);
                      }}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-sky-500 text-white font-medium transition-colors"
                    >
                      {playingId === detailItem.id ? (
                        <>
                          <Pause className="w-5 h-5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 ml-0.5" />
                          <span>Play Track</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function PortfolioFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-gray-600">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <Music2 className="w-10 h-10 text-sky-400" />
        <p className="text-sm">Loading portfolio…</p>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioFallback />}>
      <PortfolioPageContent />
    </Suspense>
  );
}
