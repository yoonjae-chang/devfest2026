"use client";

type EditableTitleProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function EditableTitle({
  value,
  onChange,
  placeholder = "Untitled Song",
  disabled = false,
}: EditableTitleProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full text-xl font-bold text-gray-900 bg-transparent border-0 border-b border-gray-200 rounded-none px-0 py-2 placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:border-gray-900 disabled:bg-gray-50"
      aria-label="Song title"
    />
  );
}
