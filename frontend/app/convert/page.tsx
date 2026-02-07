"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music2, Loader2, ArrowRight } from "lucide-react";
import { convertMp3ToMidi } from "@/lib/api";
import JSZip from "jszip";

export default function ConvertPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) =>
      /\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name)
    );
    setFiles(valid);
    setStatus("idle");
    setError(null);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setStatus("converting");
    setError(null);
    try {
      const zipBuffer = await convertMp3ToMidi(files);
      const zip = await JSZip.loadAsync(zipBuffer);
      const midiEntries = Object.entries(zip.files).filter(([, f]) =>
        f.name.endsWith(".mid")
      );
      if (midiEntries.length === 0) {
        throw new Error("No MIDI files in the conversion result");
      }
      const [name, entry] = midiEntries[0];
      const midiBlob = await entry.async("arraybuffer");
      const base64 = btoa(
        new Uint8Array(midiBlob).reduce((s, b) => s + String.fromCharCode(b), "")
      );
      sessionStorage.setItem("midi_editor_data", base64);
      sessionStorage.setItem("midi_editor_name", name);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <Music2 className="w-7 h-7" />
              MP3 to MIDI Converter
            </h1>
            <p className="text-gray-600">
              Upload audio files to convert to MIDI, then edit in the editor.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4"
            >
              Choose MP3 or audio files
            </Button>
            {files.length > 0 && (
              <p className="text-sm text-gray-600">
                {files.length} file(s): {files.map((f) => f.name).join(", ")}
              </p>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleConvert}
              disabled={files.length === 0 || status === "converting"}
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
              <Link href="/editor">
                <Button variant="secondary">
                  Open in editor
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Single-instrument tracks work best. Max 10 files, 50MB each.
          </p>
        </div>
      </main>
    </div>
  );
}
