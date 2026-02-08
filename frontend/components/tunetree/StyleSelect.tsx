"use client";

import { useEffect, useRef, useState } from "react";

const GENRE_OPTIONS = [
  "Pop",
  "Indie",
  "Hip Hop",
  "EDM",
  "Classical",
  "Lo-fi",
  "Cinematic",
] as const;

export type StyleOption = (typeof GENRE_OPTIONS)[number];

type StyleSelectProps = {
  value: StyleOption[];
  onChange: (value: StyleOption[]) => void;
  disabled?: boolean;
};

export default function StyleSelect({
  value,
  onChange,
  disabled = false,
}: StyleSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleGenre = (genre: StyleOption) => {
    if (value.includes(genre)) {
      onChange(value.filter((g) => g !== genre));
    } else {
      onChange([...value, genre]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const summary =
    value.length === 0
      ? "Select genres…"
      : value.length === 1
        ? value[0]
        : `${value.length} genres`;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-[#6B5A55]">Genres</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-left text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black-500 focus:border-black-500 disabled:bg-gray-50 disabled:text-gray-500 flex items-center justify-between"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Select genres"
        >
          <span className={value.length === 0 ? "text-gray-400" : ""}>
            {summary}
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
            role="listbox"
          >
            {GENRE_OPTIONS.map((genre) => (
              <label
                key={genre}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                role="option"
                aria-selected={value.includes(genre)}
              >
                <input
                  type="checkbox"
                  checked={value.includes(genre)}
                  onChange={() => toggleGenre(genre)}
                  className="h-4 w-4 rounded border-gray-300 text-black-500 focus:ring-black-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-gray-900">{genre}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { GENRE_OPTIONS };
