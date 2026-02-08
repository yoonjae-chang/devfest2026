"use client";

import EditableTitle from "./EditableTitle";
import LyricsEditor from "./LyricsEditor";
import StylesEditor from "./StylesEditor";
import EditableDescription from "./EditableDescription";

export type SongData = {
  title: string;
  lyrics: string;
  description: string;
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
      <EditableDescription
          value={song.description}
          onChange={(description) => update({ description })}
          scrollable
        />
      <div className="shrink-0 flex flex-col gap-4 mt-4">
        <StylesEditor
          positiveValue={song.positiveStyles}
          negativeValue={song.negativeStyles}
          onPositiveChange={(positiveStyles) => update({ positiveStyles })}
          onNegativeChange={(negativeStyles) => update({ negativeStyles })}
        />
      </div>
    </article>  
  );
}
