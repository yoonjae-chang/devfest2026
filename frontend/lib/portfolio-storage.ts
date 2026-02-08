/**
 * In-memory portfolio storage. No persistence — data is lost on refresh.
 * Studio and Portfolio share this store in the same session.
 */

export interface StoredPortfolioItem {
  id: string;
  colorClass: string;
  title: string;
  duration: number | null;
  featured: boolean;
  description: string;
  blob: Blob;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
}

// Module-level store shared by Studio and Portfolio
let store: StoredPortfolioItem[] = [];

export async function loadPortfolioItems(): Promise<StoredPortfolioItem[]> {
  return [...store];
}

/**
 * Append items to the portfolio (Studio Publish). Only adds; never deletes.
 */
export async function appendPortfolioItems(
  items: StoredPortfolioItem[]
): Promise<void> {
  if (items.length === 0) return;
  let appended = 0;
  for (const item of items) {
    if (item.blob && typeof item.blob.arrayBuffer === "function") {
      store.push(item);
      appended++;
    }
  }
  if (appended === 0) {
    throw new Error("No valid audio files to publish. Make sure each file has playable audio.");
  }
}

/**
 * Replace the entire portfolio (Portfolio page save). Used when user edits/reorders/deletes.
 */
export async function savePortfolioItems(
  items: StoredPortfolioItem[]
): Promise<void> {
  store = items.filter(
    (item) => item.blob && typeof item.blob.arrayBuffer === "function"
  );
}
