
import { toast } from 'sonner';
import { createLogger } from '../logger';

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
    
    // Log key existence (but not the actual key for security)
    logDebug(`SUPABASE_ANON_KEY exists: ${!!SUPABASE_ANON_KEY}`);
    if (!SUPABASE_ANON_KEY) {
      throw new Error("SUPABASE_ANON_KEY is missing from environment variables");
    }
    
    logDebug(`Preparing request to ${endpoint}`);
    
    console.log(`[uploadScreenshot] 📤 Capture #${captureId}, envoi vers ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": blob.type,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Explicit bearer format
        // Also add as apikey header for compatibility
        "apikey": SUPABASE_ANON_KEY
      },
      body: blob,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    logDebug(`Got response: status=${response.status}, statusText=${response.statusText}`);

    // ❌ Si le backend renvoie une erreur HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[uploadScreenshot] ❌ HTTP ${response.status} : ${errorText}`);
      logError(`HTTP Error ${response.status}: ${errorText}`, new Error(errorText));
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    try {
      // ✅ Analyse la réponse JSON
      const json = await response.json();
      if (!json.url) {
        throw new Error(`Réponse Supabase invalide : ${JSON.stringify(json)}`);
      }

      console.log(`[uploadScreenshot] ✅ Upload réussi : ${json.url}`);
      logDebug(`Upload successful: ${json.url}`);
      return json.url;
    } catch (jsonError) {
      // Handle case where response is not valid JSON
      logError("Failed to parse response as JSON", jsonError);
      throw new Error('Invalid response format from server');
    }
  } catch (err: any) {
    // Comprehensive error logging
    logError(`Upload error for capture #${captureId}`, err);
    console.error('[uploadScreenshot] ❌ Erreur réseau ou JSON:', err);
    
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
