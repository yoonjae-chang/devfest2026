"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import type { Midi } from "@tonejs/midi";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_HEIGHT = 14;
const MIN_NOTE = 21;
const MAX_NOTE = 108;
const PIXELS_PER_SECOND = 80;
const LABEL_WIDTH = 48;

function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + Math.floor(midi / 12);
}

interface PianoRollProps {
  midi: Midi;
  notes: { midi: number; time: number; duration: number; velocity: number }[];
  onNotesChange?: (notes: { midi: number; time: number; duration: number; velocity: number }[]) => void;
  selectedNoteIndex: number | null;
  onSelectNote: (index: number | null) => void;
  playbackTime?: number | null;
}

export function PianoRoll({
  midi,
  notes,
  onNotesChange,
  selectedNoteIndex,
  onSelectNote,
  playbackTime = null,
}: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ index: number; offsetX: number } | null>(null);

  const maxTime = useMemo(
    () => Math.max(...notes.map((n) => n.time + n.duration), 2),
    [notes]
  );
  const width = Math.max(400, Math.ceil(maxTime * PIXELS_PER_SECOND));
  const height = (MAX_NOTE - MIN_NOTE + 1) * NOTE_HEIGHT;

  const midiToY = useCallback((midiNote: number) => {
    return (MAX_NOTE - midiNote) * NOTE_HEIGHT;
  }, []);

  const timeToX = useCallback((time: number) => {
    return time * PIXELS_PER_SECOND;
  }, []);

  const xToTime = useCallback((x: number) => {
    return Math.max(0, x / PIXELS_PER_SECOND);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row <= MAX_NOTE - MIN_NOTE; row++) {
      const y = row * NOTE_HEIGHT;
      const isC = (MAX_NOTE - row) % 12 === 0;
      ctx.strokeStyle = isC ? "#334155" : "#1e293b";
      ctx.lineWidth = isC ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const timeStep = width > 800 ? 1 : 2;
    for (let t = 0; t <= maxTime; t += timeStep) {
      const x = timeToX(t);
      ctx.strokeStyle = t % 1 === 0 ? "#334155" : "#1e293b";
      ctx.lineWidth = t % 1 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    notes.forEach((note, i) => {
      const x = timeToX(note.time);
      const w = Math.max(6, timeToX(note.duration));
      const y = midiToY(note.midi);
      ctx.fillStyle = i === selectedNoteIndex ? "#38bdf8" : "#3b82f6";
      ctx.strokeStyle = i === selectedNoteIndex ? "#7dd3fc" : "#60a5fa";
      ctx.lineWidth = i === selectedNoteIndex ? 2 : 1;
      ctx.fillRect(x, y + 1, w, NOTE_HEIGHT - 2);
      ctx.strokeRect(x, y + 1, w, NOTE_HEIGHT - 2);
    });

    if (playbackTime != null) {
      const px = timeToX(playbackTime);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }, [notes, selectedNoteIndex, playbackTime, width, height, maxTime, timeToX, midiToY]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const scaleY = height / rect.height;
    const my = (e.clientY - rect.top) * scaleY;
    let found: number | null = null;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const x = timeToX(n.time);
      const w = Math.max(6, timeToX(n.duration));
      const y = midiToY(n.midi);
      if (mx >= x && mx <= x + w && my >= y && my <= y + NOTE_HEIGHT) {
        found = i;
        dragRef.current = { index: i, offsetX: mx - x };
        break;
      }
    }
    onSelectNote(found);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !onNotesChange) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const newTime = xToTime(mx - dragRef.current.offsetX);
    const idx = dragRef.current.index;
    const updated = [...notes];
    const oldNote = updated[idx];
    updated[idx] = { ...oldNote, time: Math.max(0, newTime), duration: oldNote.duration };
    onNotesChange(updated);
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleMouseLeave = () => {
    dragRef.current = null;
  };

  return (
    <div className="rounded-lg border border-slate-300 bg-slate-100 overflow-hidden">
      <div className="flex">
        <div
          className="flex-shrink-0 bg-slate-800 py-2 pr-1"
          style={{ width: LABEL_WIDTH }}
        >
          {Array.from({ length: MAX_NOTE - MIN_NOTE + 1 }, (_, i) => {
            const midiNote = MAX_NOTE - i;
            const isC = midiNote % 12 === 0;
            return (
              <div
                key={midiNote}
                className={`text-[10px] font-mono h-[13px] flex items-center justify-end pr-2 ${
                  isC ? "text-slate-300 font-semibold" : "text-slate-500"
                }`}
              >
                {midiToNoteName(midiNote)}
              </div>
            );
          })}
        </div>
        <div className="flex-1 overflow-auto">
          <div className="relative">
            <div
              className="absolute top-0 left-0 h-6 bg-slate-800 text-slate-400 text-xs font-mono flex items-center"
              style={{ width, minWidth: width }}
            >
              {Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => (
                <span
                  key={i}
                  className="absolute"
                  style={{ left: timeToX(i) + 4 }}
                >
                  {i}s
                </span>
              ))}
            </div>
            <div className="pt-6 overflow-x-auto">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className="cursor-pointer block"
                style={{ minWidth: width }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
