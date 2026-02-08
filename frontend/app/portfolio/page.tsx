"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Play, Pause, Star, Trash2, ChevronUp, ChevronDown, Music2, Volume2, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a)$/i;
const ARTIST_KEY = "portfolio_artist_name";
const TAGLINE_KEY = "portfolio_tagline";

const PASTEL_COLORS = [
  "bg-pink-200",
  "bg-rose-200",
  "bg-amber-200",
  "bg-lime-200",
  "bg-emerald-200",
  "bg-cyan-200",
  "bg-sky-200",
  "bg-violet-200",
  "bg-fuchsia-200",
  "bg-orange-200",
];

interface PublishItem {
  id: string;
  file: File;
  colorClass: string;
  title: string;
  duration: number | null;
  featured: boolean;
  description: string;
}

function filterMp3(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter((f) => AUDIO_EXT.test(f.name));
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

function fileNameWithoutExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export default function PortfolioPage() {
  const [artistName, setArtistName] = useState("");
  const [tagline, setTagline] = useState("");
  const [items, setItems] = useState<PublishItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Persist artist name and tagline
  useEffect(() => {
    try {
      const a = localStorage.getItem(ARTIST_KEY);
      const t = localStorage.getItem(TAGLINE_KEY);
      if (a != null) setArtistName(a);
      if (t != null) setTagline(t);
    } catch (_) {}
  }, []);
  useEffect(() => {
    try {
      if (artistName !== "") localStorage.setItem(ARTIST_KEY, artistName);
    } catch (_) {}
  }, [artistName]);
  useEffect(() => {
    try {
      localStorage.setItem(TAGLINE_KEY, tagline);
    } catch (_) {}
  }, [tagline]);

  // Load duration for items that don't have it yet
  useEffect(() => {
    const needDuration = items.filter((i) => i.duration === null);
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
  const displayOrder = [...items].sort((a, b) => Number(b.featured) - Number(a.featured));

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = filterMp3(e.target.files || []);
    if (files.length === 0) {
      e.target.value = "";
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      for (const file of files) {
        const colorClass = PASTEL_COLORS[next.length % PASTEL_COLORS.length];
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`,
          file,
          colorClass,
          title: fileNameWithoutExt(file.name),
          duration: null,
          featured: false,
          description: "",
        });
      }
      return next;
    });
    e.target.value = "";
  };

  const handlePlayClick = useCallback((item: PublishItem) => {
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
    <div className="min-h-screen bg-[#fafafa] text-gray-900 flex flex-col">
      <div className="flex-1 px-6 py-8 pb-28">
        <div className="max-w-6xl mx-auto flex flex-col h-full">
          {/* Artist profile */}
          <div className="mb-10 pt-2">
            <input
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Your artist name"
              className="text-2xl sm:text-3xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-gray-800 focus:outline-none w-full max-w-md pb-2 transition-colors placeholder:text-gray-400"
            />
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short tagline (e.g. Producer • Singer)"
              className="mt-2 text-gray-500 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-gray-600 focus:outline-none w-full max-w-md pb-1.5 text-sm transition-colors placeholder:text-gray-400"
            />
          </div>

          {/* Section header + add */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 tracking-tight">
              Releases {items.length > 0 && <span className="text-gray-500 font-normal">({items.length})</span>}
            </h2>
            <input
              ref={inputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a"
              multiple
              onChange={handleAddFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-900 text-white hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
              aria-label="Add release"
            >
              <Plus className="w-5 h-5" />
            </button>
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
                      onClick={() => handlePlayClick(item)}
                      className={`relative aspect-square rounded-2xl ${item.colorClass} flex flex-col items-center justify-center p-4 shadow-md border border-white/60 cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-all text-left w-full`}
                      title="Click to play"
                    >
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                        <Play className="w-10 h-10 text-gray-800 ml-0.5 drop-shadow-sm" />
                      </span>
                    </button>
                    {item.featured && (
                      <span className="absolute top-2 right-2 rounded-full bg-amber-400/95 p-1.5 shadow-sm" title="Featured">
                        <Star className="w-4 h-4 text-amber-900" fill="currentColor" />
                      </span>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end gap-1">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveItem(item.id, "up"); }}
                          disabled={indexInFull === 0}
                          className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm disabled:opacity-40 transition-colors"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveItem(item.id, "down"); }}
                          disabled={indexInFull === items.length - 1}
                          className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow-sm disabled:opacity-40 transition-colors"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          className="p-1.5 rounded-md bg-white/90 hover:bg-red-50 text-red-600 shadow-sm transition-colors"
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
                        className="text-sm font-medium h-8"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingTitleId(item.id)}
                        className="text-sm font-medium text-gray-800 truncate pr-1 w-full text-left hover:text-gray-600 rounded"
                      >
                        {item.title || fileNameWithoutExt(file.name)}
                      </button>
                    )}
                    <div
                      className={`absolute left-0 right-0 top-full z-10 mt-1 px-3 py-2 rounded-lg bg-gray-800 text-gray-100 text-xs transition-opacity shadow-lg min-w-[200px] ${
                        editingDescriptionId === item.id
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
                      }`}
                      aria-hidden
                    >
                      <div className="space-y-1.5">
                        <p className="font-medium text-white truncate">{file.name}</p>
                        <p>Size: {formatSize(file.size)}</p>
                        <p>Type: {getExtension(file.name)}</p>
                        <p>Modified: {formatDate(file.lastModified)}</p>
                        {item.duration != null && <p>Duration: {formatDuration(item.duration)}</p>}
                        <div className="pt-1 border-t border-gray-600">
                          <button
                            type="button"
                            className="text-amber-300 hover:text-amber-200"
                            onClick={(e) => { e.stopPropagation(); updateItem(item.id, { featured: !item.featured }); }}
                          >
                            {item.featured ? "★ Featured" : "☆ Mark as featured"}
                          </button>
                        </div>
                        {isEditingDesc ? (
                          <textarea
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                            onBlur={() => setEditingDescriptionId(null)}
                            placeholder="Add a short description..."
                            className="w-full bg-gray-700 rounded p-1.5 text-white placeholder:text-gray-400 resize-none"
                            rows={2}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingDescriptionId(item.id)}
                            className="text-left text-gray-400 hover:text-white block w-full"
                          >
                            {item.description ? item.description : "Add description..."}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
              <div className="rounded-2xl bg-white border border-gray-200/80 shadow-sm p-8 max-w-sm">
                <div className="rounded-full bg-gray-100 p-5 mb-5 inline-flex">
                  <Music2 className="w-10 h-10 text-gray-500" />
                </div>
                <p className="text-gray-800 font-semibold">Your portfolio is empty</p>
                <p className="text-sm text-gray-500 mt-2">
                  Add your first release to showcase your music. Upload an MP3 or other audio file to get started.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-6 px-5 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all shadow-sm"
                >
                  Add your first release
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentTrack && (
        <footer className="fixed bottom-0 left-0 right-0 z-20 bg-[#0d0d0d] text-white shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
          {/* Progress bar - full width */}
          <div
            ref={progressBarRef}
            role="progressbar"
            aria-valuenow={duration > 0 ? (currentTime / duration) * 100 : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-1 w-full cursor-pointer group/progress bg-white/10 hover:h-1.5 transition-[height]"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-white transition-[width] duration-75 rounded-r"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 shadow transition-opacity pointer-events-none"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            {/* Left: track info */}
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-[30%] sm:max-w-[280px] order-2 sm:order-1">
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-lg ${currentTrack.colorClass} shadow-md ring-1 ring-white/5`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-white">
                  {currentTrack.title || fileNameWithoutExt(currentTrack.file.name)}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {artistName || "Artist"}
                </p>
              </div>
            </div>

            {/* Center: play controls + time */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 order-1 sm:order-2">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={toggleBarPlayPause}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#0d0d0d] hover:scale-105 active:scale-95 transition-transform"
                  aria-label={playingId === currentTrack.id ? "Pause" : "Play"}
                >
                  {playingId === currentTrack.id ? (
                    <Pause className="w-5 h-5" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 tabular-nums">
                <span>{formatDuration(currentTime)}</span>
                <span>/</span>
                <span>{currentTrack.duration != null ? formatDuration(currentTrack.duration) : "0:00"}</span>
              </div>
            </div>

            {/* Right: volume */}
            <div className="flex items-center gap-2 w-full sm:w-[30%] sm:max-w-[140px] order-3">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white transition-colors"
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
                className="w-full h-1.5 accent-white bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
