"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type { Midi } from "@tonejs/midi";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_HEIGHT = 14;
const MIN_NOTE = 21;
const MAX_NOTE = 108;
const PIXELS_PER_SECOND = 80;
const LABEL_WIDTH = 48;
const SEEK_BAR_HIT_MARGIN = 12;
/** Extra seconds of empty space after the last note so users can add notes there */
const ADD_AFTER_PADDING = 15;
/** Maximum total length in seconds (5 minutes) - prevents infinite extension */
const MAX_TOTAL_SECONDS = 300;

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
  /** Position of the orange playback/seek bar in seconds. Shown when provided. */
  cursorPosition?: number;
  /** Called when user drags the playback bar to seek. */
  onSeek?: (time: number) => void;
  /** When provided, clicking empty space adds a note. Value is default duration in seconds. */
  addNoteDuration?: number;
  onAddNote?: (note: { midi: number; time: number; duration: number; velocity: number }) => void;
  /** When true, disables all editing (select, drag, add). */
  readOnly?: boolean;
}

export function PianoRoll({
  midi,
  notes,
  onNotesChange,
  selectedNoteIndex,
  onSelectNote,
  playbackTime = null,
  cursorPosition,
  onSeek,
  addNoteDuration,
  onAddNote,
  readOnly = false,
}: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null);
  const [isSeekDragging, setIsSeekDragging] = useState(false);

  const contentEndTime = useMemo(
    () => (notes.length > 0 ? Math.max(...notes.map((n) => n.time + n.duration)) : 2),
    [notes]
  );
  const maxTime = Math.min(
    Math.max(contentEndTime + ADD_AFTER_PADDING, 2),
    MAX_TOTAL_SECONDS
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

  const yToMidi = useCallback((y: number) => {
    const row = Math.round(y / NOTE_HEIGHT);
    return Math.max(MIN_NOTE, Math.min(MAX_NOTE, MAX_NOTE - row));
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

    const barTime = playbackTime ?? cursorPosition ?? null;
    if (barTime != null) {
      const px = timeToX(barTime);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }
  }, [notes, selectedNoteIndex, playbackTime, cursorPosition, width, height, maxTime, timeToX, midiToY]);

  useEffect(() => {
    draw();
  }, [draw]);

  const barTime = playbackTime ?? cursorPosition ?? null;
  useEffect(() => {
    if (barTime == null || !scrollContainerRef.current) return;
    const px = barTime * PIXELS_PER_SECOND;
    const el = scrollContainerRef.current;
    const { scrollLeft, clientWidth } = el;
    const padding = 80;
    if (px < scrollLeft + padding) {
      el.scrollLeft = Math.max(0, px - padding);
    } else if (px > scrollLeft + clientWidth - padding) {
      el.scrollLeft = px - clientWidth + padding;
    }
  }, [barTime]);

  const isOverSeekBar = useCallback(
    (mx: number) => {
      if (barTime == null || !onSeek) return false;
      const barX = timeToX(barTime);
      return Math.abs(mx - barX) <= SEEK_BAR_HIT_MARGIN;
    },
    [barTime, onSeek, timeToX]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    if (isOverSeekBar(mx) && onSeek) {
      setIsSeekDragging(true);
      onSeek(xToTime(mx));
      return;
    }

    if (readOnly) return;
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
        dragRef.current = { index: i, offsetX: mx - x, offsetY: my - y };
        break;
      }
    }
    if (found !== null) {
      onSelectNote(found);
    } else if (onAddNote && addNoteDuration != null) {
      let time = xToTime(mx);
      time = Math.max(0, Math.min(time, MAX_TOTAL_SECONDS - addNoteDuration));
      const midiNote = yToMidi(my);
      onAddNote({
        midi: midiNote,
        time,
        duration: addNoteDuration,
        velocity: 0.8,
      });
    } else {
      onSelectNote(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;

    if (isSeekDragging && onSeek) {
      onSeek(xToTime(mx));
      return;
    }

    if (readOnly || !dragRef.current || !onNotesChange) return;
    const scaleY = height / rect.height;
    const my = (e.clientY - rect.top) * scaleY;
    const idx = dragRef.current.index;
    const oldNote = notes[idx];
    let newTime = xToTime(mx - dragRef.current.offsetX);
    newTime = Math.max(0, Math.min(newTime, MAX_TOTAL_SECONDS - oldNote.duration));
    const newMidi = yToMidi(my - dragRef.current.offsetY);
    const updated = [...notes];
    updated[idx] = {
      ...oldNote,
      time: newTime,
      midi: newMidi,
      duration: oldNote.duration,
    };
    onNotesChange(updated);
  };

  const handleMouseUp = () => {
    setIsSeekDragging(false);
    dragRef.current = null;
  };

  const handleMouseLeave = () => {
    if (!isSeekDragging) dragRef.current = null;
  };

  useEffect(() => {
    if (!isSeekDragging || !onSeek) return;
    const onWindowMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = width / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      onSeek(xToTime(mx));
    };
    const onWindowMouseUp = () => setIsSeekDragging(false);
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [isSeekDragging, onSeek, xToTime, width]);

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
        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-slate-900">
          <div className="relative" style={{ width, minWidth: width }}>
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
            <div className="pt-6" style={{ width, minWidth: width }}>
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className={
                  isSeekDragging ? "cursor-ew-resize block" : readOnly ? "cursor-pointer block opacity-90" : "cursor-pointer block"
                }
                style={{ minWidth: width }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
