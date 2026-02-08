"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Music2, Loader2, Plus, X, Download, Upload, ArrowRight } from "lucide-react";
import { backendApi } from "@/lib/api";
import { appendPortfolioItems, type StoredPortfolioItem } from "@/lib/portfolio-storage";

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a)$/i;
const MAX_FILES = 10;

const PASTEL_COLORS = [
  "bg-sky-100", "bg-blue-100", "bg-indigo-100", "bg-violet-100", "bg-slate-200",
  "bg-cyan-100", "bg-sky-200", "bg-blue-200", "bg-teal-100", "bg-slate-100",
];

function filterValidFiles(fileList: FileList | File[]): File[] {
  const arr = Array.from(fileList);
  return arr.filter((f) => AUDIO_EXT.test(f.name));
}

function fileNameWithoutExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function StudioPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("run_id");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [convertedCount, setConvertedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingRunMusic, setLoadingRunMusic] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setLoadingRunMusic(true);
    setError(null);
    backendApi
      .getRunMusicZip(runId)
      .then(async (blob) => {
        if (cancelled) return;
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await blob.arrayBuffer());
        const audioEntries = Object.entries(zip.files).filter(
          ([name]) => !name.endsWith("/") && AUDIO_EXT.test(name)
        );
        const newFiles: File[] = [];
        for (const [name, entry] of audioEntries) {
          if (newFiles.length >= MAX_FILES) break;
          const blob = await entry.async("blob");
          const baseName = name.split("/").pop() || name;
          newFiles.push(new File([blob], baseName, { type: blob.type || "audio/mpeg" }));
        }
        if (!cancelled) setFiles(newFiles);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load generated music");
      })
      .finally(() => {
        if (!cancelled) setLoadingRunMusic(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  // Reset status when files become empty
  useEffect(() => {
    if (files.length === 0) {
      setStatus("idle");
    }
  }, [files.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = filterValidFiles(e.target.files || []);
    if (selected.length === 0) {
      e.target.value = "";
      return;
    }
    setFiles((prev) => {
      // If no files exist, replace; otherwise add to existing
      if (prev.length === 0) {
        return selected;
      }
      const merged = [...prev];
      const keys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      for (const f of selected) {
        if (merged.length >= MAX_FILES) break;
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!keys.has(key)) {
          merged.push(f);
          keys.add(key);
        }
      }
      return merged;
    });
    setStatus("idle");
    setError(null);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = filterValidFiles(e.dataTransfer.files);
    if (dropped.length === 0) return;
    setFiles((prev) => {
      const merged = [...prev];
      const keys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      for (const f of dropped) {
        if (merged.length >= MAX_FILES) break;
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!keys.has(key)) {
          merged.push(f);
          keys.add(key);
        }
      }
      return merged;
    });
    setStatus("idle");
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    // Reset status if we had a successful conversion (since the conversion was for the old file set)
    if (status === "success") {
      setStatus("idle");
    }
  };

  const handleDownloadMp3 = async () => {
    if (files.length === 0) return;
    if (files.length === 1) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.name, file, { binary: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio-tracks.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setStatus("converting");
    setError(null);
    try {
      const allFiles = await backendApi.convertMp3ToMidi(files);
      if (allFiles.length === 0) {
        throw new Error("No MIDI files in the conversion result");
      }
      sessionStorage.setItem("midi_editor_files", JSON.stringify(allFiles));
      sessionStorage.setItem("midi_editor_data", allFiles[0].data);
      sessionStorage.setItem("midi_editor_name", allFiles[0].name);
      setConvertedCount(allFiles.length);
      setStatus("success");

      // Auto-download: single .mid file or zip of multiple
      if (allFiles.length === 1) {
        const { name, data } = allFiles[0];
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/midi" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name.endsWith(".mid") ? name : `${name}.mid`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const { name, data } of allFiles) {
          const binary = atob(data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          zip.file(name.endsWith(".mid") ? name : `${name}.mid`, bytes, { binary: true });
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "studio-midi-tracks.zip";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setStatus("error");
    }
  };

  const handlePublish = async () => {
    if (files.length === 0) return;
    setError(null);
    setPublishSuccess(false);
    try {
      const timestamp = Date.now();
      const newItems: StoredPortfolioItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buf = await file.arrayBuffer();
        const blob = new Blob([buf], { type: file.type || "audio/mpeg" });
        newItems.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${timestamp}-${i}`,
          colorClass: PASTEL_COLORS[i % PASTEL_COLORS.length],
          title: fileNameWithoutExt(file.name),
          duration: null,
          featured: false,
          description: "",
          lyrics: "",
          blob,
          fileName: file.name,
          fileSize: file.size,
          fileLastModified: file.lastModified,
        });
      }
      await appendPortfolioItems(newItems);
      // Clear files after successful publish
      setFiles([]);
      setStatus("idle");
      setPublishSuccess(true);
      // Hide success message after 10 seconds
      setTimeout(() => {
        setPublishSuccess(false);
      }, 10000);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : err instanceof Error
            ? err.message
            : "Failed to publish to portfolio";
      setError(message);
    }
  };

  return (
    <div className="flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center md:pt-28 pt-16 px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2 text-[#1e3a5f] drop-shadow-md">
              <Music2 className="w-7 h-7" />
              Studio
            </h1>
            <p className="text-[#1e3a5f]/90 drop-shadow-sm">
              Upload audio files to convert to MIDI, then edit in the editor.
            </p>
          </div>

          <div className="w-full rounded-2xl glass-panel border border-white/20 bg-white/10 p-6 space-y-6 shadow-xl min-h-[400px]">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging
                ? "border-sky-400/70 bg-sky-100/40"
                : "border-white/40 bg-white/20 hover:border-white/50 hover:bg-white/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-white/20"
              >
                {files.length === 0 ? (
                  "Choose files"
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add more files
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-700 mt-3">
              or drag and drop audio files here
            </p>
            {loadingRunMusic && (
              <p className="text-sm text-sky-600 mt-3 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading generated music…
              </p>
            )}
            {files.length > 0 && (
              <div className="mt-4 space-y-2 text-left max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between text-sm bg-white/95 border border-white/40 rounded-lg px-3 py-2 text-gray-900 shadow-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-500 hover:text-red-600 p-1 transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-600">
                  {files.length} / {MAX_FILES} files
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center items-center mt-36 w-full">
            <Button
              onClick={handleDownloadMp3}
              disabled={files.length === 0}
              variant="outline"
              className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download MP3
            </Button>
            {status === "success" ? (
              <Link href="/editor">
                <Button
                  variant="outline"
                  className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900"
                >
                  Go to editor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleConvert}
                disabled={files.length === 0 || status === "converting"}
                variant="outline"
                className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900 disabled:opacity-50"
              >
                {status === "converting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Converting…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Convert to MIDI
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handlePublish}
              disabled={files.length === 0}
              variant="outline"
              className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Publish
            </Button>
          </div>

          <div className="flex flex-wrap h-3 gap-3 justify-center">
             {publishSuccess && (
              <>Successfully published to portfolio!<Link className="ml-[-3px] underline text-sky-600 hover:text-sky-800" href="/portfolio?published=1">View portfolio</Link></>
             )}
          </div>


          <p className="text-center text-sm text-gray-600">
            Single-instrument tracks work best. Max 10 files, 50MB each.
          </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 flex flex-col items-center justify-center py-12 px-6">
            <div className="w-full max-w-2xl space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2 text-[#1e3a5f] drop-shadow-md">
                  <Music2 className="w-7 h-7" />
                  Studio
                </h1>
                <p className="text-[#1e3a5f]/90 drop-shadow-sm">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      }
    >
      <StudioPageContent />
    </Suspense>
  );
}
