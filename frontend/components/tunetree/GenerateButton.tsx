"use client";

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

type GenerateButtonProps = {
  disabled: boolean;
  onClick: () => void;
  isLoading?: boolean;
};

export default function GenerateButton({ disabled, onClick, isLoading = false }: GenerateButtonProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <InteractiveHoverButton
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className="justify-center items-center w-[400px] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        aria-label="Generate song"
      >
        {isLoading ? "Generating..." : "Generate"}
      </InteractiveHoverButton>
    </div>
  );
}
