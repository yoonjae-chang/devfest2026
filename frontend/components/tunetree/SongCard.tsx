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
  glass?: boolean;
  /** Rendered at the bottom inside the card (e.g. actions) */
  footer?: React.ReactNode;
};

export default function SongCard({
  song,
  onChange,
  variantLabel,
  glass = false,
  footer,
}: SongCardProps) {
  const update = (patch: Partial<SongData>) => {
    onChange({ ...song, ...patch });
  };

  const articleClass = glass
    ? "relative flex flex-col h-full min-h-0 glass-panel border border-white/20 bg-white/10 rounded-xl p-4 overflow-hidden shadow-xl"
    : "relative flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-xl p-6 overflow-hidden shadow-sm";

  const spacing = glass ? "mt-2 gap-2" : "mt-4 gap-4";
  const borderSpacing = glass ? "mt-2 pt-2" : "mt-4 pt-4";

  return (
    <article className={articleClass}>
      <div className="shrink-0 relative z-10">
        <EditableTitle
          value={song.title}
          onChange={(title) => update({ title })}
          navy={glass}
        />
      </div>
      <div className={`relative z-10 flex-1 min-h-0 flex flex-col ${spacing} overflow-hidden`}>
        <LyricsEditor
          value={song.lyrics}
          onChange={(lyrics) => update({ lyrics })}
          scrollable
          glass={glass}
        />
      </div>
      <EditableDescription
          value={song.description}
          onChange={(description) => update({ description })}
          scrollable
          glass={glass}
        />
      <div className={`relative z-10 shrink-0 flex flex-col ${spacing}`}>
        <StylesEditor
          positiveValue={song.positiveStyles}
          negativeValue={song.negativeStyles}
          onPositiveChange={(positiveStyles) => update({ positiveStyles })}
          onNegativeChange={(negativeStyles) => update({ negativeStyles })}
          glass={glass}
        />
      </div>
      <div className={`relative z-10 shrink-0 ${borderSpacing} border-t ${glass ? "border-white/20" : "border-slate-200"}`} />
      {footer != null ? (
        <div className={`relative z-10 shrink-0 ${borderSpacing} flex flex-col gap-1.5`}>
          {footer}
        </div>
      ) : null}
    </article>  
  );
}
