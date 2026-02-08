/**
 * API client for backend communication
 * Backend runs on http://localhost:8000 by default
 * All requests require authentication via Supabase session token
 */

import { createClient } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get the current user's access token for authentication
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Get the current authenticated user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * Make an authenticated API request to the backend
 * Requires user to be logged in
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Get authentication token
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options?.headers,
    },
    credentials: "include", // Include cookies for CORS
  });

  if (!response.ok) {
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new Error("Authentication failed. Please log in again.");
    }
    
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

// Example API calls
export const backendApi = {
  // Test endpoint
  getRoot: () => apiRequest<{ message: string }>("/"),
  
  // Generate composition plan
  generateCompositionPlan: async (data: {
    user_prompt: string;
    styles: string[];
    lyrics_exists: boolean;
    run_id: string;
    user_id?: string; // Optional, will be auto-filled if not provided
  }) => {
    // Auto-fill user_id if not provided
    if (!data.user_id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Authentication required. Please log in.");
      }
      data.user_id = userId;
    }
    return apiRequest("/generate/composition-plan", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Compare compositions
  compareCompositions: async (data: {
    composition_plan_1_id: number;
    composition_plan_2_id: number;
    composition_plan_1_better: boolean;
    run_id: string;
    user_id?: string; // Optional, will be auto-filled if not provided
  }) => {
    // Auto-fill user_id if not provided
    if (!data.user_id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Authentication required. Please log in.");
      }
      data.user_id = userId;
    }
    return apiRequest("/customize/compare-compositions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Lyrics substitution
  lyricsSubstitution: async (data: {
    composition_plan_id: number;
    lyrics: Record<string, any>;
    run_id: string;
    user_id?: string; // Optional, will be auto-filled if not provided
  }) => {
    // Auto-fill user_id if not provided
    if (!data.user_id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Authentication required. Please log in.");
      }
      data.user_id = userId;
    }
    return apiRequest("/generate-music/lyrics-substitution", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Generate final composition
  generateFinalComposition: async (data: {
    composition_plan_id: number;
    run_id: string;
    user_id?: string; // Optional, will be auto-filled if not provided
  }) => {
    // Auto-fill user_id if not provided
    if (!data.user_id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Authentication required. Please log in.");
      }
      data.user_id = userId;
    }
    return apiRequest("/generate-music/generate-final-composition", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Update composition plan
  updateCompositionPlan: async (data: {
    composition_id: number;
    composition_plan: Record<string, any>;
    user_id?: string; // Optional, will be auto-filled if not provided
  }) => {
    // Auto-fill user_id if not provided
    if (!data.user_id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Authentication required. Please log in.");
      }
      data.user_id = userId;
    }
    return apiRequest(`/generate/composition-plan/${data.composition_id}`, {
      method: "PUT",
      body: JSON.stringify({
        composition_plan: data.composition_plan,
        user_id: data.user_id,
      }),
    });
  },
  
  // Convert MP3/audio to MIDI via Next.js API proxy
  convertMp3ToMidi,

  // GET endpoints - Fetch data from Supabase
  getCompositionPlan: (compositionId: number) => 
    apiRequest(`/generate/composition-plan/${compositionId}`),
  
  getCompositionPlansByRun: (runId: string) => 
    apiRequest(`/generate/composition-plans/run/${runId}`),
  
  getFinalComposition: (compositionPlanId: number) => 
    apiRequest(`/generate-music/final-composition/${compositionPlanId}`),
  
  getFinalCompositionsByRun: (runId: string) => 
    apiRequest(`/generate-music/final-compositions/run/${runId}`),
};

/**
 * Convert MP3 (or other audio) files to MIDI via the Next.js API proxy.
 * Requires user to be logged in. Converts each file separately and combines results.
 */
export async function convertMp3ToMidi(files: File[]): Promise<{ name: string; data: string }[]> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  const results: { name: string; data: string }[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("files", file);
    const res = await fetch("/api/convert/mp3-to-midi", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
    }
    const zipBuffer = await res.arrayBuffer();
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(zipBuffer);
    const midiEntries = Object.entries(zip.files).filter(
      ([name]) => name.endsWith(".mid")
    );
    if (midiEntries.length === 0) {
      throw new Error(`No MIDI produced for ${file.name}`);
    }
    for (const [name, entry] of midiEntries) {
      const midiBlob = await entry.async("arraybuffer");
      const base64 = btoa(
        new Uint8Array(midiBlob).reduce((s, b) => s + String.fromCharCode(b), "")
      );
      results.push({ name, data: base64 });
    }
  }
  return results;
}
