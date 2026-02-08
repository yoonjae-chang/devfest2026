import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/** Derive a human-readable song title from a filename (e.g. "my_song.mp3" -> "my song"). */
export function displayNameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")  // strip extension
    .split("__")[0]           // remove __ and everything after
    .replace(/_/g, " ")       // underscores to spaces
    .replace(/-/g, " ")       // hyphens to spaces
    .replace(/\s+/g, " ")     // collapse multiple spaces
    .trim();
}
