/**
 * Persists portfolio items to IndexedDB (supports File/Blob storage).
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "tunetree-portfolio";
const DB_VERSION = 1;
const STORE_NAME = "items";

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

function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
}

export async function loadPortfolioItems(): Promise<StoredPortfolioItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAll(STORE_NAME);
    return items ?? [];
  } catch {
    return [];
  }
}

export async function savePortfolioItems(
  items: StoredPortfolioItem[]
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    await tx.store.clear();
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch (e) {
    console.warn("Failed to save portfolio:", e);
  }
}
