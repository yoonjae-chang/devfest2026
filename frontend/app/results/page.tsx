"use client";

import { useState } from "react";
import { LineShadowText } from "@/components/ui/line-shadow-text";
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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-black overflow-hidden">
      <main className="flex-1 flex flex-col items-center min-h-0 py-10 px-6">
        <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 min-h-0 gap-10">
          
          {/* Header */}
          <div className="text-center space-y-4 shrink-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-balance">
              Choose a{" "}
              <LineShadowText shadowColor="black" className="italic">
                version
              </LineShadowText>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
              Pick the version you like. We’ll regenerate the other based on your edits.
            </p>

            <div className="h-0.5 w-20 bg-black/70 mx-auto rounded-full" />


          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
            <div className="relative group transition-transform duration-300 hover:-translate-y-1">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-300/40 to-lime-300/40 blur opacity-0 group-hover:opacity-100 transition" />
              <SongCard
                song={songA}
                onChange={setSongA}
                variantLabel="Version A"
              />
            </div>

            <div className="relative group transition-transform duration-300 hover:-translate-y-1">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-300/40 to-orange-300/40 blur opacity-0 group-hover:opacity-100 transition" />
              <SongCard
                song={songB}
                onChange={setSongB}
                variantLabel="Version B"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
