
import { toast } from 'sonner';
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Upload screenshot to Supabase Function
 */
export async function uploadScreenshot(blob: Blob, captureId: number): Promise<string> {
  const endpoint = `https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/capture-screenshot?t=${Date.now()}`;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  try {
    // Log blob details for debugging
    logDebug(`Uploading screenshot #${captureId}: type=${blob.type}, size=${blob.size} bytes`);
    
    // Set up request with proper Authorization header
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // Add auth header
        'Cache-Control': 'no-cache'
      },
      body: blob,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    try {
      const result = await response.json();
      logDebug(`Upload successful: ${result.url}`);
      return result.url || '';
    } catch (jsonError) {
      // Handle case where response is not valid JSON
      logError("Failed to parse response as JSON", jsonError);
      throw new Error('Invalid response format from server');
    }
  } catch (err: any) {
    // Comprehensive error logging
    logError(`Upload error for capture #${captureId}`, err);
    console.error('[uploadScreenshot] ❌ Upload error:', err);
    
    // Re-throw the error for proper retry handling
    throw err;
  }
}
