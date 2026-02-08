"use client";

import { ShineBorder } from "@/components/ui/shine-border";
import EditableTitle from "./EditableTitle";
import LyricsEditor from "./LyricsEditor";
import StylesEditor from "./StylesEditor";

export type SongData = {
  title: string;
  lyrics: string;
  positiveStyles: string;
  negativeStyles: string;
};

type SongCardProps = {
  song: SongData;
  onChange: (song: SongData) => void;
  variantLabel?: string;
};

export default function SongCard({
  song,
  onChange,
  variantLabel,
}: SongCardProps) {
  const update = (patch: Partial<SongData>) => {
    onChange({ ...song, ...patch });
  };

  return (
    <article className="relative flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-xl p-6 overflow-hidden shadow-sm">
      <ShineBorder
        shineColor={["#64748b", "#94a3b8", "#7dd3fc"]}
        borderWidth={1.5}
        duration={8}
      />
      <div className="shrink-0 relative z-10">
        <EditableTitle
          value={song.title}
          onChange={(title) => update({ title })}
        />
      </div>
      <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-4 mt-4 overflow-hidden">
        <LyricsEditor
          value={song.lyrics}
          onChange={(lyrics) => update({ lyrics })}
          scrollable
        />
      </div>
      <div className="relative z-10 shrink-0 flex flex-col gap-4 mt-4">
        <StylesEditor
          positiveValue={song.positiveStyles}
          negativeValue={song.negativeStyles}
          onPositiveChange={(positiveStyles) => update({ positiveStyles })}
          onNegativeChange={(negativeStyles) => update({ negativeStyles })}
        />
      </div>
      <div className="relative z-10 shrink-0 mt-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          className="w-full py-2.5 px-4 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2"
          aria-label={variantLabel ? `Select ${variantLabel}` : "Select this version"}
        >
          Select this version
        </button>
      </div>
    </article>
  );
}
