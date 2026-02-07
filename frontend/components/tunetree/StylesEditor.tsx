"use client";

type StylesEditorProps = {
  positiveValue: string;
  negativeValue: string;
  onPositiveChange: (value: string) => void;
  onNegativeChange: (value: string) => void;
  disabled?: boolean;
};

export default function StylesEditor({
  positiveValue,
  negativeValue,
  onPositiveChange,
  onNegativeChange,
  disabled = false,
}: StylesEditorProps) {
  const inputClass =
    "w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="positive-styles" className="text-sm font-medium text-gray-700">
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
      <div className="flex flex-col gap-2">
        <label htmlFor="negative-styles" className="text-sm font-medium text-gray-700">
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
