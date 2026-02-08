"use client";

import { useEffect, useRef, useState } from "react";

const GENRE_OPTIONS = [
  "Pop",
  "R&B",
  "Hip Hop",
  "EDM",
  "Classical",
  "Indie",
  "Phonk",
  "Rock",
  "Jazz",
  "Country",
  "Metal",
  "Folk"
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
          className="w-full px-3 py-2 text-left text-[#6B5A55] bg-white border border-white-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500 disabled:bg-gray-50 disabled:text-gray-500 flex items-center justify-between"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Select genres"
        >
          <span className={value.length === 0 ? "text-gray-400" : ""}>
            {summary}
          </span>
          <svg
            className={`w-4 h-4 text-[#6B5A55] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            {/* Backdrop overlay to block clicks behind the dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              className="absolute z-50 mt-1 w-full min-w-[200px] max-h-[280px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              role="listbox"
              onClick={(e) => e.stopPropagation()}
            >
              {GENRE_OPTIONS.map((genre) => (
                <label
                  key={genre}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  role="option"
                  aria-selected={value.includes(genre)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(genre)}
                    onChange={() => toggleGenre(genre)}
                    className="h-4 w-4 rounded border-gray-300 accent-[#6B5A55] focus:ring-[#6B5A55]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-[#6B5A55]">{genre}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { GENRE_OPTIONS };
