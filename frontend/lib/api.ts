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
};
