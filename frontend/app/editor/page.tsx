"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "@/components/midi/PianoRoll";
import { Play, Square, Download, ArrowLeft, Undo2, Plus } from "lucide-react";

interface NoteShape {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function EditorPage() {
  const [midi, setMidi] = useState<Midi | null>(null);
  const [notes, setNotes] = useState<NoteShape[]>([]);
  const [midiName, setMidiName] = useState<string>("");
  const [midiFiles, setMidiFiles] = useState<{ name: string; data: string }[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [addNoteDuration, setAddNoteDuration] = useState(0.25); // 1/4 note default
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);
  const [seekPosition, setSeekPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const synthRef = useRef<Tone.Sampler | Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const originalNotesRef = useRef<NoteShape[]>([]);

  const loadMidiFromData = useCallback((data: string, name: string) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const parsed = new Midi(bytes.buffer);
    const allNotes =
      parsed.tracks[0]?.notes.map((n) => ({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
      })) ?? [];
    setMidi(parsed);
    setMidiName(name);
    originalNotesRef.current = allNotes;
    setNotes(allNotes);
    setSelectedNoteIndex(null);
    setSeekPosition(0);
    return parsed;
  }, []);

  useEffect(() => {
    const filesJson = sessionStorage.getItem("midi_editor_files");
    const data = sessionStorage.getItem("midi_editor_data");
    const name = sessionStorage.getItem("midi_editor_name") || "edited.mid";

    if (filesJson) {
      try {
        const files: { name: string; data: string }[] = JSON.parse(filesJson);
        if (files.length === 0) {
          setError("No MIDI data. Convert an MP3 first.");
          return;
        }
        setMidiFiles(files);
        setCurrentFileIndex(0);
        loadMidiFromData(files[0].data, files[0].name);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load MIDI");
      }
      return;
    }

    if (!data) {
      setError("No MIDI data. Convert an MP3 first.");
      return;
    }
    try {
      loadMidiFromData(data, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MIDI");
    }
  }, [loadMidiFromData]);

  const handleNotesChange = useCallback((newNotes: NoteShape[]) => {
    setNotes(newNotes);
  }, []);

  const handleRevert = useCallback(() => {
    setNotes([...originalNotesRef.current]);
    setSelectedNoteIndex(null);
  }, []);

  const handleAddNote = useCallback((note: NoteShape) => {
    const next = [...notes, note].sort((a, b) => a.time - b.time);
    setNotes(next);
    const idx = next.findIndex((n) => n.time === note.time && n.midi === note.midi && n.duration === note.duration);
    setSelectedNoteIndex(idx >= 0 ? idx : null);
  }, [notes]);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    const currentTime = transport.seconds;
    transport.stop();
    transport.cancel();
    transport.seconds = 0;
    partRef.current?.dispose();
    partRef.current = null;
    if (synthRef.current) {
      if ("releaseAll" in synthRef.current) synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(null);
    setSeekPosition(currentTime);
  }, []);

  const play = useCallback(async () => {
    if (!midi || notes.length === 0) return;
    await Tone.start();
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.seconds = 0;
    partRef.current?.dispose();
    partRef.current = null;
    if (synthRef.current) {
      if ("releaseAll" in synthRef.current) synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    const events = notes.map((n) => [
      n.time,
      {
        name: NOTE_NAMES[n.midi % 12] + Math.floor(n.midi / 12),
        duration: n.duration,
        velocity: n.velocity,
      },
    ] as [number, { name: string; duration: number; velocity: number }]);
    const maxTime = Math.max(...notes.map((n) => n.time + n.duration), 0);

    const sampler = new Tone.Sampler(
      {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      {
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        onload: () => {
          const part = new Tone.Part((time, ev) => {
            sampler.triggerAttackRelease(ev.name, ev.duration, time, ev.velocity);
          }, events);
          part.start(0);
          transport.seconds = seekPosition;
          transport.scheduleRepeat(() => {
            setPlaybackTime(transport.seconds);
          }, 0.05);
          transport.scheduleOnce(() => {
            stop();
          }, maxTime + 0.2);
          partRef.current = part;
          transport.start();
          setIsPlaying(true);
        },
      }
    ).toDestination();
    synthRef.current = sampler;
  }, [midi, notes, seekPosition, stop]);

  const handleSeek = useCallback((time: number) => {
    const maxTime = notes.length > 0 ? Math.max(...notes.map((n) => n.time + n.duration), 0) : 0;
    const clamped = Math.max(0, Math.min(time, maxTime));
    setSeekPosition(clamped);
    if (isPlaying && partRef.current) {
      const transport = Tone.getTransport();
      transport.seconds = clamped;
      setPlaybackTime(clamped);
    }
  }, [notes, isPlaying]);

  const download = () => {
    if (!midi) return;
    const exportMidi = new Midi();
    const track = exportMidi.addTrack();
    notes.forEach((n) => {
      track.addNote({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
      });
    });
    const arr = exportMidi.toArray();
    const blob = new Blob([new Uint8Array(arr)], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = midiName.replace(".mid", "_edited.mid");
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-600">{error}</p>
        <Link href="/studio">
          <Button>Convert MP3 to MIDI first</Button>
        </Link>
      </div>
    );
  }

  if (!midi) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-6 bg-gray-100 text-gray-900 flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/studio">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold">MIDI Editor</h1>
          {midiFiles.length > 1 ? (
            <div className="flex border-b border-slate-200">
              {midiFiles.map((f, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i === currentFileIndex) return;
                    if (isPlaying) stop();
                    setCurrentFileIndex(i);
                    loadMidiFromData(midiFiles[i].data, midiFiles[i].name);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    i === currentFileIndex
                      ? "text-blue-600 border-blue-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500">{midiName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRevert} disabled={isPlaying} title="Revert to original MIDI">
            <Undo2 className="w-4 h-4 mr-2" />
            Revert
          </Button>
          <Button onClick={play} disabled={isPlaying} size="sm">
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
          <Button variant="secondary" onClick={stop} disabled={!isPlaying} size="sm">
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
          <Button variant="outline" onClick={download} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download MIDI
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto flex justify-center">
        <div className="max-w-5xl w-full space-y-4 mx-auto">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <h3 className="font-medium text-slate-800 mb-2">How to use</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Play</strong> — Click Play to hear your MIDI. Drag the orange bar to seek or set the start position.</li>
              <li>• <strong>Move notes</strong> — Click a note (blue bar), then drag horizontally to change timing or vertically to change pitch.</li>
              <li>• <strong>Revert</strong> — Click Revert to restore the original MIDI (undo all edits).</li>
              <li>• <strong>Add notes</strong> — Pick a duration below, then click empty space. You can add notes after the end (up to 5 min total).</li>
              <li>• <strong>Download</strong> — Save your edited MIDI file when done.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Note bank</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Duration:</span>
              {[
                { label: "1/8", sec: 0.125 },
                { label: "1/4", sec: 0.25 },
                { label: "1/2", sec: 0.5 },
                { label: "1", sec: 1 },
              ].map(({ label, sec }) => (
                <Button
                  key={sec}
                  variant={addNoteDuration === sec ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setAddNoteDuration(sec)}
                  disabled={isPlaying}
                >
                  {label}
                </Button>
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {isPlaying ? "Stop playback to edit" : "Click empty space on the piano roll to add a note"}
            </span>
          </div>

          <PianoRoll
            midi={midi}
            notes={notes}
            onNotesChange={handleNotesChange}
            selectedNoteIndex={selectedNoteIndex}
            onSelectNote={setSelectedNoteIndex}
            playbackTime={playbackTime}
            cursorPosition={isPlaying ? (playbackTime ?? 0) : seekPosition}
            onSeek={handleSeek}
            addNoteDuration={addNoteDuration}
            onAddNote={handleAddNote}
            readOnly={isPlaying}
          />
        </div>
      </main>
    </div>
  );
}
