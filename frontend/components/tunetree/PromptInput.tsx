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
  placeholder = "Describe the song you want to generate. Themes, lyrics, specific styles...",
  disabled = false,
}: PromptInputProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={5}
      className="w-full px-4 py-3 text-gray-900 bg-white/95 border border-white/30 rounded-xl resize-y min-h-[120px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 disabled:bg-white/70 disabled:text-gray-500"
      aria-label="Song description"
    />
  );
}
