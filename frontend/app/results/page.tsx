"use client";

import { useState } from "react";
import SongCard, { type SongData } from "@/components/tunetree/SongCard";

const MOCK_SONG_A: SongData = {
  title: "Summer Drive",
  lyrics:
    "Windows down and the radio on\nWe're leaving the city before the break of dawn\n\nChorus:\nTake me where the highway runs\nUnderneath the morning sun",
  positiveStyles: "upbeat, melodic, pop, driving",
  negativeStyles: "dark, slow",
};

const MOCK_SONG_B: SongData = {
  title: "Open Road",
  lyrics:
    "Just you and me and the open road\nNo map, no plan, just the way we go\n\nChorus:\nEvery mile is a memory\nEvery turn sets us free",
  positiveStyles: "indie, acoustic, warm",
  negativeStyles: "electronic, aggressive",
};

export default function ResultsPage() {
  const [songA, setSongA] = useState<SongData>(MOCK_SONG_A);
  const [songB, setSongB] = useState<SongData>(MOCK_SONG_B);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-gray-900 overflow-hidden">
      <main className="flex-1 flex flex-col items-center min-h-0 py-6 sm:py-8 px-6">
        <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 min-h-0 gap-6">
          <div className="text-center space-y-2 shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Choose a version
            </h1>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Choose a version to keep. The other will be regenerated based on your tastes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-1 min-h-0">
            <SongCard song={songA} onChange={setSongA} variantLabel="Version A" />
            <SongCard song={songB} onChange={setSongB} variantLabel="Version B" />
          </div>
        </div>
      </main>
    </div>
  );
}
