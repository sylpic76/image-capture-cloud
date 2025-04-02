
import { createLogger } from '../logger';
import { toast } from 'sonner';

const { logDebug, logError } = createLogger();

/**
 * Uploads a screenshot blob to the server and returns the URL
 */
export const uploadScreenshot = async (blob: Blob, captureId: number): Promise<string> => {
  const formData = new FormData();
  formData.append('screenshot', blob, `screenshot_${Date.now()}.png`);
  
  // Add timestamp to prevent caching
  const timestamp = Date.now();
  const requestUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-screenshot?t=${timestamp}`;
  
  logDebug(`Sending captured screenshot to: ${requestUrl}`);
  
  // Use more robust fetch with timeout and better error handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    // Add retry logic for network issues
    let retryCount = 0;
    const maxRetries = 2;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'X-Priority': 'high',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
          },
          signal: controller.signal,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        logDebug(`Upload successful: ${result.url}`);
        
        if (!result.url) {
          throw new Error("Response missing URL property");
        }
        
        clearTimeout(timeoutId);
        return result.url;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount <= maxRetries) {
          // Wait before retrying with exponential backoff
          const waitTime = Math.min(1000 * Math.pow(1.5, retryCount), 3000);
          logDebug(`Upload failed, retrying (${retryCount}/${maxRetries}) after ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          break;
        }
      }
    }
    
    // If we've exhausted all retries, throw the last error
    clearTimeout(timeoutId);
    throw lastError;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      logError("Upload request timed out after 15 seconds", error);
      toast.error("La requête de capture d'écran a expiré. Veuillez vérifier votre connexion internet.");
      throw new Error("Upload request timed out after 15 seconds");
    }
    
    logError("Failed to upload screenshot", error);
    toast.error("Erreur lors de l'envoi de la capture d'écran. Veuillez vérifier votre connexion réseau.");
    throw error;
  }
};
