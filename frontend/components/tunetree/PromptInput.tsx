"use client";

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function PromptInput({
  value,
  onChange,
  placeholder = "Describe the song you want to generate. This can include a general theme, lyrics, specific styles, or any other details you want to include...",
  disabled = false,
}: PromptInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={5}
      className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg resize-y min-h-[120px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black-500 focus:border-black-500 disabled:bg-gray-50 disabled:text-gray-500"
      aria-label="Song description"
    />
  );
}
