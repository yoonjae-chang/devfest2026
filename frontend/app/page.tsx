"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptInput from "@/components/tunetree/PromptInput";
import StyleSelect, { type StyleOption } from "@/components/tunetree/StyleSelect";
import LyricsToggle from "@/components/tunetree/LyricsToggle";
import GenerateButton from "@/components/tunetree/GenerateButton";
import { VideoText } from "@/components/ui/video-text";
import { backendApi } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [genres, setGenres] = useState<StyleOption[]>([]);
  const [includeLyrics, setIncludeLyrics] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRunId = () => {
    // Generate a unique run ID using timestamp and random string
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert StyleOption[] to string[] (styles)
      // StyleOption is already a string type, so we can use it directly
      const styles = genres;

      // Generate a unique run ID for this generation session
      const runId = generateRunId();

      // Store generation parameters for later use
      const generationParams = {
        user_prompt: prompt.trim(),
        styles: styles,
        lyrics_exists: includeLyrics,
      };
      sessionStorage.setItem("generationParams", JSON.stringify(generationParams));

      // Generate TWO composition plans with the same run_id
      const [plan1, plan2] = await Promise.all([
        backendApi.generateCompositionPlan({
          user_prompt: prompt.trim(),
          styles: styles,
          lyrics_exists: includeLyrics,
          run_id: runId,
        }) as Promise<{ id: number; composition_plan: any; user_id: string; run_id: string }>,
        backendApi.generateCompositionPlan({
          user_prompt: prompt.trim(),
          styles: styles,
          lyrics_exists: includeLyrics,
          run_id: runId,
        }) as Promise<{ id: number; composition_plan: any; user_id: string; run_id: string }>,
      ]);

      // Navigate to results page with both composition plans
      router.push(`/results?run_id=${runId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate composition plans. Please try again.";
      setError(errorMessage);
      
      // If authentication error, redirect to login
      if (errorMessage.includes("Authentication") || errorMessage.includes("log in")) {
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
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

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <GenerateButton
                disabled={!prompt.trim()}
                onClick={handleGenerate}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
