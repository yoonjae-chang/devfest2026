"use client";

type StylesEditorProps = {
  positiveValue: string;
  negativeValue: string;
  onPositiveChange: (value: string) => void;
  onNegativeChange: (value: string) => void;
  disabled?: boolean;
  glass?: boolean;
};

export default function StylesEditor({
  positiveValue,
  negativeValue,
  onPositiveChange,
  onNegativeChange,
  disabled = false,
  glass = false,
}: StylesEditorProps) {
  const labelClass = glass ? "text-sm font-medium text-[#1e3a5f] shrink-0" : "text-sm font-medium text-gray-700 shrink-0";
  const inputClass = glass
    ? "w-full min-w-0 px-3 py-2 text-gray-900 bg-white/55 border border-white/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 disabled:bg-white/30 placeholder:text-gray-500 overflow-x-auto"
    : "w-full min-w-0 px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 overflow-x-auto";

  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <label htmlFor="positive-styles" className={labelClass}>
          Positive styles
        </label>
        <input
          id="positive-styles"
          type="text"
          value={positiveValue}
          onChange={(e) => onPositiveChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. upbeat, melodic, pop"
          className={inputClass}
          aria-label="Positive styles"
        />
      </div>
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <label htmlFor="negative-styles" className={labelClass}>
          Negative styles
        </label>
        <input
          id="negative-styles"
          type="text"
          value={negativeValue}
          onChange={(e) => onNegativeChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. dark, heavy"
          className={inputClass}
          aria-label="Negative styles"
        />
      </div>
    </div>
  );
}
