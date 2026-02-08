"use client";

type DescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  scrollable?: boolean;
};

export default function DescriptionEditor({
  value,
  onChange,
  disabled = false,
  scrollable = false,
}: DescriptionEditorProps) {
  return (
    <div
      className={`flex flex-col gap-2 ${scrollable ? "flex-1 min-h-0 overflow-hidden" : ""}`}
    >
      <label htmlFor="description-editor" className="text-sm font-medium text-gray-700 shrink-0">
        Description
      </label>
      <textarea
        id="description-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={scrollable ? undefined : 6}
        className={`w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 ${
          scrollable
            ? "flex-1 min-h-0 resize-none overflow-auto"
            : "resize-y min-h-[120px]"
        }`}
        placeholder="Enter song description..."
        aria-label="Song description"
      />
    </div>
  );
}
