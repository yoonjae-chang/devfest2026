"use client";

type LyricsToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function LyricsToggle({
  checked,
  onChange,
  disabled = false,
}: LyricsToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="lyrics-toggle"
        className="text-sm font-medium text-gray-700 cursor-pointer"
      >
        Include lyrics
      </label>
      <button
        id="lyrics-toggle"
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={checked ? "Lyrics included" : "Instrumental only"}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full border border-gray-300
          transition-colors focus:outline-none focus:ring-2 focus:ring-black-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? "bg-black border-black" : "bg-gray-200"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white border border-gray-300
            transform transition-transform mt-0.5
            ${checked ? "translate-x-5" : "translate-x-0.5"}
          `}
        />
      </button>
    </div>
  );
}
