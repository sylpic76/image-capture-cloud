
import { toast } from 'sonner';
import { createLogger } from '../logger';
import { supabase } from "@/integrations/supabase/client"; 

const { logDebug, logError } = createLogger();

/**
 * Upload screenshot to Supabase Function
 */
export async function uploadScreenshot(blob: Blob, captureId: number): Promise<string> {
  const endpoint = `https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/capture-screenshot?t=${Date.now()}`;
  
  try {
    // Log blob details for debugging
    logDebug(`Uploading screenshot #${captureId}: type=${blob.type}, size=${blob.size} bytes`);
    
    // Get the anon key directly from environment variables
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Set up request with only the apikey header, no JWT auth
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type,
        'apikey': SUPABASE_ANON_KEY,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: blob,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError(`HTTP Error ${response.status}: ${errorText}`, new Error(errorText));
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
    
    // Enhanced error message for network errors
    const errorMessage = err.message || String(err);
    
    // Show user-friendly message
    if (errorMessage.includes('401')) {
      toast.error("Erreur lors de l'envoi. Vérifiez les autorisations.");
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      toast.error("Erreur réseau. Vérifiez votre connexion internet.");
    } else {
      toast.error(`Échec de l'envoi de la capture d'écran: ${errorMessage}`);
    }
    
    // Re-throw the error for proper retry handling
    throw err;
  }
}
