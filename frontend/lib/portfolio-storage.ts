/**
 * Portfolio storage using Supabase database.
 * All portfolio items are persisted to the database with audio files in Supabase Storage.
 */

import { backendApi } from "./api";

export interface StoredPortfolioItem {
  id: string;
  colorClass: string;
  title: string;
  duration: number | null;
  featured: boolean;
  description: string;
  lyrics: string;
  blob: Blob;
  fileName: string;
  fileSize: number;
  fileLastModified: number;
  cover_image_url?: string;
}

/**
 * Load all portfolio items from the database.
 * Downloads audio files from Supabase Storage and converts them to Blobs.
 */
export async function loadPortfolioItems(): Promise<StoredPortfolioItem[]> {
  try {
    const items = await backendApi.getPortfolioItems();
    
    // Convert database items to StoredPortfolioItem format
    const storedItems: StoredPortfolioItem[] = [];
    
    for (const item of items) {
      try {
        // Download audio file from storage
        const audioBlob = await backendApi.getPortfolioAudio(item.id);
        
        storedItems.push({
          id: item.id,
          colorClass: item.color_class,
          title: item.title,
          duration: item.duration,
          featured: item.featured,
          description: item.description || "",
          lyrics: item.lyrics || "",
          blob: audioBlob,
          fileName: item.file_name,
          fileSize: item.file_size,
          fileLastModified: item.file_last_modified,
          cover_image_url: item.cover_image_url || undefined,
        });
      } catch (error) {
        console.error(`Failed to load audio for item ${item.id}:`, error);
        // Skip items that fail to load audio
      }
    }
    
    return storedItems;
  } catch (error) {
    console.error("Failed to load portfolio items:", error);
    return [];
  }
}

/**
 * Append items to the portfolio (Studio Publish). Creates new items in the database.
 */
export async function appendPortfolioItems(
  items: StoredPortfolioItem[]
): Promise<void> {
  if (items.length === 0) return;
  
  let appended = 0;
  for (const item of items) {
    try {
      if (!item.blob || typeof item.blob.arrayBuffer !== "function") {
        console.warn(`Skipping item ${item.id}: invalid blob`);
        continue;
      }
      
      // Convert Blob to File for upload
      const file = new File([item.blob], item.fileName, {
        type: item.blob.type || "audio/mpeg",
        lastModified: item.fileLastModified,
      });
      
      // Create item in database
      await backendApi.createPortfolioItem(
        {
          id: item.id,
          color_class: item.colorClass,
          title: item.title,
          duration: item.duration,
          featured: item.featured,
          description: item.description || "",
          lyrics: item.lyrics || "",
          file_name: item.fileName,
          file_size: item.fileSize,
          file_last_modified: item.fileLastModified,
          cover_image_url: item.cover_image_url || null,
        },
        file
      );
      
      appended++;
    } catch (error) {
      console.error(`Failed to append item ${item.id}:`, error);
      // Continue with other items even if one fails
    }
  }
  
  if (appended === 0) {
    throw new Error("No valid audio files to publish. Make sure each file has playable audio.");
  }
}

/**
 * Save portfolio items (update existing or create new).
 * This is used when user edits/reorders/deletes items on the Portfolio page.
 * Updates metadata for existing items, creates new items with audio files.
 */
export async function savePortfolioItems(
  items: StoredPortfolioItem[]
): Promise<void> {
  try {
    // Get current items from database
    const currentItems = await backendApi.getPortfolioItems();
    const currentIds = new Set(currentItems.map((item) => item.id));
    const newIds = new Set(items.map((item) => item.id));
    
    // Delete items that are no longer in the list
    const deletePromises = [];
    for (const currentItem of currentItems) {
      if (!newIds.has(currentItem.id)) {
        deletePromises.push(
          backendApi.deletePortfolioItem(currentItem.id).catch((error) => {
            console.error(`Failed to delete item ${currentItem.id}:`, error);
          })
        );
      }
    }
    await Promise.all(deletePromises);
    
    // Update or create items
    const updatePromises = [];
    for (const item of items) {
      if (!item.blob || typeof item.blob.arrayBuffer !== "function") {
        console.warn(`Skipping item ${item.id}: invalid blob`);
        continue;
      }
      
      if (currentIds.has(item.id)) {
        // Update existing item (metadata only, no audio re-upload)
        updatePromises.push(
          backendApi.updatePortfolioItem(item.id, {
            title: item.title,
            duration: item.duration,
            featured: item.featured,
            description: item.description || "",
            lyrics: item.lyrics || "",
            color_class: item.colorClass,
            cover_image_url: item.cover_image_url || null,
          }).catch((error) => {
            console.error(`Failed to update item ${item.id}:`, error);
          })
        );
      } else {
        // Create new item (with audio file)
        const file = new File([item.blob], item.fileName, {
          type: item.blob.type || "audio/mpeg",
          lastModified: item.fileLastModified,
        });
        
        updatePromises.push(
          backendApi.createPortfolioItem(
            {
              id: item.id,
              color_class: item.colorClass,
              title: item.title,
              duration: item.duration,
              featured: item.featured,
              description: item.description || "",
              lyrics: item.lyrics || "",
              file_name: item.fileName,
              file_size: item.fileSize,
              file_last_modified: item.fileLastModified,
              cover_image_url: item.cover_image_url || null,
            },
            file
          ).catch((error) => {
            console.error(`Failed to create item ${item.id}:`, error);
          })
        );
      }
    }
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Failed to save portfolio items:", error);
    throw error;
  }
}
