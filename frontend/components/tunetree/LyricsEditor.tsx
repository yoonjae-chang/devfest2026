"use client";

type LyricsEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  scrollable?: boolean;
  glass?: boolean;
};

export default function LyricsEditor({
  value,
  onChange,
  disabled = false,
  scrollable = false,
  glass = false,
}: LyricsEditorProps) {
  const labelClass = glass ? "text-sm font-medium text-[#1e3a5f] shrink-0" : "text-sm font-medium text-gray-700 shrink-0";
  const boxClass = glass
    ? "w-full px-3 py-2 text-gray-900 bg-white/55 border border-white/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 disabled:bg-white/30 placeholder:text-gray-500"
    : "w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50";
  return (
    <div
      className={`flex flex-col gap-2 ${scrollable ? "flex-1 min-h-0 overflow-hidden" : ""}`}
    >
      <label htmlFor="lyrics-editor" className={labelClass}>
        Lyrics
      </label>
      <textarea
        id="lyrics-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={scrollable ? undefined : 10}
        className={`${boxClass} ${
          scrollable
            ? "flex-1 min-h-0 resize-none overflow-auto"
            : "resize-y min-h-[160px]"
        }`}
        aria-label="Song lyrics"
      />
    </div>
  );
}
