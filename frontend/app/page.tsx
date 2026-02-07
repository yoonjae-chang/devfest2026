"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptInput from "@/components/tunetree/PromptInput";
import StyleSelect, { type StyleOption } from "@/components/tunetree/StyleSelect";
import LyricsToggle from "@/components/tunetree/LyricsToggle";
import GenerateButton from "@/components/tunetree/GenerateButton";
import { VideoText } from "@/components/ui/video-text";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [genres, setGenres] = useState<StyleOption[]>([]);
  const [includeLyrics, setIncludeLyrics] = useState(true);

  const handleGenerate = () => {
    const formState = { prompt, genres, includeLyrics };
    console.log("Generate form state:", formState);
    router.push("/results");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center py-12 sm:py-16">
        <div className="w-full px-6 text-center space-y-4 mb-8">
          <div className="relative h-[120px] sm:h-[160px] w-full max-w-6xl mx-auto min-w-0">
            <VideoText
              src="/video/hero.webm"
              className="w-full h-full"
              fontSize={16}
              fontWeight="bold"
            >
              TuneTree
            </VideoText>
          </div>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Describe your idea and let TuneTree generate music.
          </p>
        </div>

        <div className="w-full max-w-2xl flex flex-col items-center gap-8 px-6">
          <div className="w-full space-y-6">
            <PromptInput value={prompt} onChange={setPrompt} />

            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              <div className="flex-1 min-w-0">
                <StyleSelect value={genres} onChange={setGenres} />
              </div>
              <div className="flex items-end">
                <LyricsToggle
                  checked={includeLyrics}
                  onChange={setIncludeLyrics}
                />
              </div>
            </div>

            <div className="pt-2">
              <GenerateButton
                disabled={!prompt.trim()}
                onClick={handleGenerate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
