"use client";

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
    <article className="flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-lg p-6 overflow-hidden">
      <div className="shrink-0">
        <EditableTitle
          value={song.title}
          onChange={(title) => update({ title })}
        />
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-4 mt-4 overflow-hidden">
        <LyricsEditor
          value={song.lyrics}
          onChange={(lyrics) => update({ lyrics })}
          scrollable
        />
      </div>
      <div className="shrink-0 flex flex-col gap-4 mt-4">
        <StylesEditor
          positiveValue={song.positiveStyles}
          negativeValue={song.negativeStyles}
          onPositiveChange={(positiveStyles) => update({ positiveStyles })}
          onNegativeChange={(negativeStyles) => update({ negativeStyles })}
        />
      </div>
      <div className="shrink-0 mt-4 pt-4 border-t border-gray-200">
        <button
          type="button"
          className="w-full py-2.5 px-4 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          aria-label={variantLabel ? `Select ${variantLabel}` : "Select this version"}
        >
          Select this version
        </button>
      </div>
    </article>
  );
}
