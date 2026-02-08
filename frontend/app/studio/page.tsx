"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music2, Loader2, ArrowRight, Plus, X } from "lucide-react";
import { backendApi } from "@/lib/api";

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a)$/i;
const MAX_FILES = 10;

function filterValidFiles(fileList: FileList | File[]): File[] {
  const arr = Array.from(fileList);
  return arr.filter((f) => AUDIO_EXT.test(f.name));
}

export default function StudioPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [convertedCount, setConvertedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const chooseInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleChooseFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = filterValidFiles(e.target.files || []);
    setFiles(selected);
    setStatus("idle");
    setError(null);
    e.target.value = "";
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = filterValidFiles(e.target.files || []);
    if (selected.length === 0) {
      e.target.value = "";
      return;
    }
    setFiles((prev) => {
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
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-6">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2 text-white drop-shadow-md">
              <Music2 className="w-7 h-7" />
              Studio
            </h1>
            <p className="text-white/90 drop-shadow-sm">
              Upload audio files to convert to MIDI, then edit in the editor.
            </p>
          </div>

          <div className="w-full rounded-2xl glass-panel border border-white/20 bg-white/10 p-6 space-y-6 shadow-xl">
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
              ref={chooseInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a"
              multiple
              onChange={handleChooseFiles}
              className="hidden"
            />
            <input
              ref={addInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a"
              multiple
              onChange={handleAddFiles}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => chooseInputRef.current?.click()}
                className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900"
              >
                Choose files
              </Button>
              <Button
                variant="outline"
                onClick={() => addInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="glass-button border-white/30 bg-white/20 text-gray-900 hover:bg-white/40 hover:text-gray-900 disabled:opacity-50 disabled:hover:bg-white/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add more
              </Button>
            </div>
            <p className="text-sm text-gray-700 mt-3">
              or drag and drop audio files here
            </p>
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

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleConvert}
              disabled={files.length === 0 || status === "converting"}
              className="bg-gray-900 text-white hover:bg-gray-800 border border-gray-800"
            >
              {status === "converting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting…
                </>
              ) : (
                "Convert to MIDI"
              )}
            </Button>
            {status === "success" && (
              <div className="flex flex-col items-center gap-2">
                {convertedCount > 1 && (
                  <p className="text-sm text-gray-700">
                    {convertedCount} files converted. Switch between them in the editor.
                  </p>
                )}
                <Link href="/editor">
                  <Button
                    variant="secondary"
                    className="glass-button bg-white/30 text-gray-900 border-white/40 hover:bg-white/50 hover:text-gray-900"
                  >
                    Open in editor
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
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
