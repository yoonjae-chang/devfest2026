"use client";

type EditableTitleProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, use navy styling (e.g. on results page glass cards) */
  navy?: boolean;
};

export default function EditableTitle({
  value,
  onChange,
  placeholder = "Untitled Song",
  disabled = false,
  navy = false,
}: EditableTitleProps) {
  const baseClass =
    "w-full text-xl font-bold bg-transparent border-0 border-b rounded-none px-0 py-2 focus:outline-none focus:ring-0 disabled:bg-gray-50";
  const classWhenDefault =
    "text-gray-900 border-gray-200 placeholder:text-gray-400 focus:border-gray-900";
  const classWhenNavy =
    "text-[#1e3a5f] border-[#1e3a5f]/40 placeholder:text-[#1e3a5f]/50 focus:border-[#1e3a5f]";

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${baseClass} ${navy ? classWhenNavy : classWhenDefault}`}
      aria-label="Song title"
    />
  );
}
