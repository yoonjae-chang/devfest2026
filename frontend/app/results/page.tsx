"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LineShadowText } from "@/components/ui/line-shadow-text";
import SongCard, { type SongData } from "@/components/tunetree/SongCard";
import { backendApi } from "@/lib/api";

type CompositionPlan = {
  title?: string;
  positiveGlobalStyles?: string[];
  negativeGlobalStyles?: string[];
  description?: string;
  lyrics?: Record<string, string | { lines: string[] }>;
};

type CompositionPlanResponse = {
  id: number;
  composition_plan: CompositionPlan;
  user_id: string;
  run_id: string;
  user_prompt?: string;
  user_styles?: string[];
  lyrics_exists?: boolean;
  better_than_id?: number | null;
  created_at?: string;
};

// Convert composition plan to SongData format
function compositionPlanToSongData(
  plan: CompositionPlan,
  description?: string
): SongData {
  // Extract lyrics
  let lyricsText = "";
  if (plan.lyrics) {
    const lyricsArray: string[] = [];
  
    for (const [sectionName, sectionContent] of Object.entries(plan.lyrics)) {
      // If the section is an array (like your JSON), join the lines
      if (Array.isArray(sectionContent)) {
        lyricsArray.push(`${sectionName}:\n${sectionContent.join("\n")}`);
      } 
      // Fallback for strings
      else if (typeof sectionContent === "string") {
        lyricsArray.push(`${sectionName}:\n${sectionContent}`);
      }
    }
  
    lyricsText = lyricsArray.join("\n\n");
  }

  // Use title from plan, fallback to description, then default
  const title = plan.title || description || plan.description?.substring(0, 50) || "Generated Song";

  return {
    title: title,
    description: plan.description || description || "No description provided",
    lyrics: lyricsText || "No lyrics provided",
    positiveStyles: plan.positiveGlobalStyles?.join(", ") || "",
    negativeStyles: plan.negativeGlobalStyles?.join(", ") || "",
  };
}

// Convert SongData back to CompositionPlan format
function songDataToCompositionPlan(songData: SongData, originalPlan?: CompositionPlan): CompositionPlan {
  // Parse lyrics back into sections
  let lyrics: Record<string, string> = {};
  if (songData.lyrics && songData.lyrics !== "No lyrics provided") {
    const sections = songData.lyrics.split("\n\n");
    for (const section of sections) {
      const lines = section.split("\n");
      if (lines.length > 0) {
        const sectionName = lines[0].replace(":", "");
        const sectionContent = lines.slice(1).join("\n");
        if (sectionName && sectionContent) {
          lyrics[sectionName] = sectionContent;
        }
      }
    }
  } else if (originalPlan?.lyrics) {
    // Preserve original lyrics structure if no lyrics provided
    lyrics = originalPlan.lyrics as Record<string, string>;
  }

  // Parse styles
  const positiveGlobalStyles = songData.positiveStyles
    ? songData.positiveStyles.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : originalPlan?.positiveGlobalStyles || [];
  
  const negativeGlobalStyles = songData.negativeStyles
    ? songData.negativeStyles.split(",").map(s => s.trim()).filter(s => s.length > 0)
    : originalPlan?.negativeGlobalStyles || [];

  return {
    title: songData.title,
    description: songData.description,
    positiveGlobalStyles,
    negativeGlobalStyles,
    lyrics: Object.keys(lyrics).length > 0 ? lyrics : originalPlan?.lyrics,
  };
}

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [songA, setSongA] = useState<SongData | null>(null);
  const [songB, setSongB] = useState<SongData | null>(null);
  const [compositionAId, setCompositionAId] = useState<number | null>(null);
  const [compositionBId, setCompositionBId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<"A" | "B" | null>(null);
  const [originalPlanA, setOriginalPlanA] = useState<CompositionPlan | null>(null);
  const [originalPlanB, setOriginalPlanB] = useState<CompositionPlan | null>(null);
  const saveTimeoutRefA = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRefB = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingMusicA, setIsGeneratingMusicA] = useState(false);
  const [isGeneratingMusicB, setIsGeneratingMusicB] = useState(false);
  const [generatedMusicA, setGeneratedMusicA] = useState<{ audio_path: string; audio_filename: string } | null>(null);
  const [generatedMusicB, setGeneratedMusicB] = useState<{ audio_path: string; audio_filename: string } | null>(null);

  useEffect(() => {
    const loadCompositions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get run_id from URL params
        const runIdParam = searchParams.get("run_id");

        if (!runIdParam) {
          setError("No run_id provided. Please generate a new composition.");
          setIsLoading(false);
          return;
        }

        setRunId(runIdParam);

        // Fetch all composition plans for this run
        const plans = await backendApi.getCompositionPlansByRun(runIdParam) as CompositionPlanResponse[];

        console.log(plans);
        if (!plans || plans.length === 0) {
          setError("No composition plans found for this run. Please generate a new one.");
          setIsLoading(false);
          return;
        }

        // Filter out plans that have a better_than_id (these are improved versions from comparisons)
        // We want to show the two most recent base plans for comparison
        const basePlans = plans.filter(plan => !plan.better_than_id);
        
        // Get the two most recent base plans (by created_at or by order in array)
        // Since they're ordered by created_at ascending, take the last two
        const plansToShow = basePlans.length >= 2 
          ? basePlans.slice(-2)  // Last two base plans
          : basePlans;  // Or all if less than 2

        if (plansToShow.length >= 2) {
          // We have 2 plans to compare
          const planA = plansToShow[plansToShow.length - 2];  // Second to last
          const planB = plansToShow[plansToShow.length - 1];  // Last
          
          setCompositionAId(planA.id);
          setCompositionBId(planB.id);
          
          setOriginalPlanA(planA.composition_plan);
          setOriginalPlanB(planB.composition_plan);
          
          const songDataA = compositionPlanToSongData(planA.composition_plan);
          const songDataB = compositionPlanToSongData(planB.composition_plan);
          
          setSongA(songDataA);
          setSongB(songDataB);
        } else if (plansToShow.length === 1) {
          // Only one base plan, this shouldn't happen if generation worked correctly
          // But handle it gracefully - generate a second one
          const planA = plansToShow[0];
          setCompositionAId(planA.id);
          
          setOriginalPlanA(planA.composition_plan);
          
          const songDataA = compositionPlanToSongData(planA.composition_plan);
          setSongA(songDataA);
          
          // Generate second version as fallback
          await generateSecondVersion(planA);
        } else {
          setError("No valid composition plans found. Please generate a new one.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load compositions");
      } finally {
        setIsLoading(false);
      }
    };

    loadCompositions();
  }, [searchParams]);

  // Save changes to composition A with debouncing
  useEffect(() => {
    if (!songA || !compositionAId || !originalPlanA) return;

    // Clear existing timeout
    if (saveTimeoutRefA.current) {
      clearTimeout(saveTimeoutRefA.current);
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRefA.current = setTimeout(async () => {
      try {
        const currentOriginalPlan = originalPlanA; // Capture current value
        const updatedPlan = songDataToCompositionPlan(songA, currentOriginalPlan);
        await backendApi.updateCompositionPlan({
          composition_id: compositionAId,
          composition_plan: updatedPlan,
        });
        // Update original plan to reflect saved state
        setOriginalPlanA(updatedPlan);
      } catch (err) {
        console.error("Error saving composition A:", err);
        // Don't show error to user for auto-save failures
      }
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRefA.current) {
        clearTimeout(saveTimeoutRefA.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songA, compositionAId]);

  // Save changes to composition B with debouncing
  useEffect(() => {
    if (!songB || !compositionBId || !originalPlanB) return;

    // Clear existing timeout
    if (saveTimeoutRefB.current) {
      clearTimeout(saveTimeoutRefB.current);
    }

    // Set new timeout to save after 1 second of no changes
    saveTimeoutRefB.current = setTimeout(async () => {
      try {
        const currentOriginalPlan = originalPlanB; // Capture current value
        const updatedPlan = songDataToCompositionPlan(songB, currentOriginalPlan);
        await backendApi.updateCompositionPlan({
          composition_id: compositionBId,
          composition_plan: updatedPlan,
        });
        // Update original plan to reflect saved state
        setOriginalPlanB(updatedPlan);
      } catch (err) {
        console.error("Error saving composition B:", err);
        // Don't show error to user for auto-save failures
      }
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRefB.current) {
        clearTimeout(saveTimeoutRefB.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songB, compositionBId]);

  const handleGenerateMusic = async (version: "A" | "B") => {
    const compositionId = version === "A" ? compositionAId : compositionBId;
    if (!compositionId || !runId) {
      setError("Missing composition ID or run ID. Please try again.");
      return;
    }

    try {
      if (version === "A") {
        setIsGeneratingMusicA(true);
      } else {
        setIsGeneratingMusicB(true);
      }
      setError(null);

      const result = await backendApi.generateFinalComposition({
        composition_plan_id: compositionId,
        run_id: runId,
      }) as { audio_path: string; audio_filename: string; id: number };

      if (version === "A") {
        setGeneratedMusicA({
          audio_path: result.audio_path,
          audio_filename: result.audio_filename,
        });
      } else {
        setGeneratedMusicB({
          audio_path: result.audio_path,
          audio_filename: result.audio_filename,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate music");
    } finally {
      if (version === "A") {
        setIsGeneratingMusicA(false);
      } else {
        setIsGeneratingMusicB(false);
      }
    }
  };

  const generateSecondVersion = async (firstPlan: CompositionPlanResponse) => {
    try {
      // Get original generation parameters from sessionStorage
      const paramsStr = sessionStorage.getItem("generationParams");
      
      if (!paramsStr) {
        throw new Error("Missing generation parameters");
      }

      const params = JSON.parse(paramsStr);
      
      // Generate second version with the same parameters
      const response = await backendApi.generateCompositionPlan({
        user_prompt: params.user_prompt,
        styles: params.styles,
        lyrics_exists: params.lyrics_exists,
        run_id: firstPlan.run_id,
      }) as CompositionPlanResponse;

      setCompositionBId(response.id);
      setOriginalPlanB(response.composition_plan);
      const songDataB = compositionPlanToSongData(response.composition_plan);
      setSongB(songDataB);
    } catch (err) {
      console.error("Error generating second version:", err);
      setError(`Failed to generate second version: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSelectVersion = async (version: "A" | "B") => {
    if (!compositionAId || !compositionBId || !runId) {
      setError("Missing composition IDs. Please try again.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      // Mark the selected version
      setSelectedVersion(version);
      
      // Determine which is better based on selection
      const composition_plan_1_better = version === "A";
      
      // Get the better plan ID (this one stays)
      const betterPlanId = composition_plan_1_better ? compositionAId : compositionBId;
      const worsePlanId = composition_plan_1_better ? compositionBId : compositionAId;
      
      // Call compare compositions API - this generates a new improved composition based on the comparison
      const improvedComposition = await backendApi.compareCompositions({
        composition_plan_1_id: compositionAId,
        composition_plan_2_id: compositionBId,
        composition_plan_1_better,
        run_id: runId,
      }) as { id: number; composition_plan: CompositionPlan };

      // Update the non-selected version with the improved composition from the comparison
      if (version === "A") {
        // Keep A, replace B with improved version
        setCompositionBId(improvedComposition.id);
        setOriginalPlanB(improvedComposition.composition_plan);
        const songDataB = compositionPlanToSongData(improvedComposition.composition_plan);
        setSongB(songDataB);
      } else {
        // Keep B, replace A with improved version
        setCompositionAId(improvedComposition.id);
        setOriginalPlanA(improvedComposition.composition_plan);
        const songDataA = compositionPlanToSongData(improvedComposition.composition_plan);
        setSongA(songDataA);
      }
      
      // Reset selection after replacement
      setSelectedVersion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process selection");
      setSelectedVersion(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white text-gray-900">
        <div className="text-center">
          <p className="text-lg">Loading compositions...</p>
        </div>
      </div>
    );
  }

  if (error && !songA && !songB) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white text-gray-900">
        <div className="text-center space-y-4">
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Go Back to Generate
          </button>
        </div>
      </div>
    );
  }

  if (!songA || !songB) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white text-gray-900">
        <div className="text-center">
          <p className="text-lg">Preparing compositions...</p>
        </div>
      </div>
    );
  }

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

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-1 min-h-0">
            <div 
              className={`relative flex flex-col transition-all ${
                selectedVersion === "A" ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg" : ""
              }`}
            >
              <SongCard song={songA} onChange={setSongA} variantLabel="Version A" />
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleGenerateMusic("A")}
                  disabled={isGeneratingMusicA || !compositionAId}
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMusicA ? "Generating Music..." : "Generate Music"}
                </button>
                {generatedMusicA && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 mb-2">Music generated successfully!</p>
                    <audio controls className="w-full">
                      <source src={`/api/music/${generatedMusicA.audio_filename}`} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
            <div 
              className={`relative flex flex-col transition-all ${
                selectedVersion === "B" ? "ring-4 ring-blue-500 ring-offset-2 rounded-lg" : ""
              }`}
            >
              <SongCard song={songB} onChange={setSongB} variantLabel="Version B" />
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => handleGenerateMusic("B")}
                  disabled={isGeneratingMusicB || !compositionBId}
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMusicB ? "Generating Music..." : "Generate Music"}
                </button>
                {generatedMusicB && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 mb-2">Music generated successfully!</p>
                    <audio controls className="w-full">
                      <source src={`/api/music/${generatedMusicB.audio_filename}`} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-center gap-4 shrink-0">
            <button
              onClick={() => handleSelectVersion("A")}
              disabled={isProcessing || selectedVersion !== null}
              className="px-6 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Select Version A"}
            </button>
            <button
              onClick={() => handleSelectVersion("B")}
              disabled={isProcessing || selectedVersion !== null}
              className="px-6 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Select Version B"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen bg-white text-gray-900">
          <div className="text-center">
            <p className="text-lg">Loading compositions...</p>
          </div>
        </div>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
