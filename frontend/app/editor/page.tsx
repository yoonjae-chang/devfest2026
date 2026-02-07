"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Button } from "@/components/ui/button";
import { PianoRoll } from "@/components/midi/PianoRoll";
import { Play, Square, Download, ArrowLeft } from "lucide-react";

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
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem("midi_editor_data");
    const name = sessionStorage.getItem("midi_editor_name") || "edited.mid";
    if (!data) {
      setError("No MIDI data. Convert an MP3 first.");
      return;
    }
    try {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const parsed = new Midi(bytes.buffer);
      setMidi(parsed);
      setMidiName(name);
      const allNotes =
        parsed.tracks[0]?.notes.map((n) => ({
          midi: n.midi,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity,
        })) ?? [];
      setNotes(allNotes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MIDI");
    }
  }, []);

  const handleNotesChange = useCallback((newNotes: NoteShape[]) => {
    setNotes(newNotes);
  }, []);

  const stop = useCallback(() => {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.seconds = 0;
    partRef.current?.dispose();
    partRef.current = null;
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(null);
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
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.2 },
    }).toDestination();
    synthRef.current = synth;
    const events = notes.map((n) => [
      n.time,
      {
        name: NOTE_NAMES[n.midi % 12] + Math.floor(n.midi / 12),
        duration: n.duration,
        velocity: n.velocity,
      },
    ] as [number, { name: string; duration: number; velocity: number }]);
    const part = new Tone.Part((time, ev) => {
      synth.triggerAttackRelease(ev.name, ev.duration, time, ev.velocity);
    }, events);
    part.start(0);
    const maxTime = Math.max(...notes.map((n) => n.time + n.duration), 0);
    transport.scheduleRepeat((time) => {
      setPlaybackTime(transport.seconds);
    }, 0.05);
    transport.scheduleOnce(() => {
      stop();
    }, maxTime + 0.2);
    partRef.current = part;
    transport.start();
    setIsPlaying(true);
  }, [midi, notes, stop]);

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-600">{error}</p>
        <Link href="/convert">
          <Button>Convert MP3 to MIDI first</Button>
        </Link>
      </div>
    );
  }

  if (!midi) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/convert">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold">MIDI Editor</h1>
          <span className="text-sm text-gray-500">{midiName}</span>
        </div>
        <div className="flex items-center gap-2">
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

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <h3 className="font-medium text-slate-800 mb-2">How to use</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Play</strong> — Click Play to hear your MIDI. Click Stop to silence it.</li>
              <li>• <strong>Move notes</strong> — Click a note (blue bar), then drag left or right to change its timing.</li>
              <li>• <strong>Piano roll</strong> — Each row is a note (C4, D4, etc.). Time runs left to right in seconds.</li>
              <li>• <strong>Download</strong> — Save your edited MIDI file when done.</li>
            </ul>
          </div>
          <PianoRoll
            midi={midi}
            notes={notes}
            onNotesChange={handleNotesChange}
            selectedNoteIndex={selectedNoteIndex}
            onSelectNote={setSelectedNoteIndex}
            playbackTime={playbackTime}
          />
        </div>
      </main>
    </div>
  );
}
