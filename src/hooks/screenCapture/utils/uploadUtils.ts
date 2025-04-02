
import { createLogger } from '../logger';

const { logDebug } = createLogger();

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
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    logDebug(`Upload successful: ${result.url}`);
    
    if (!result.url) {
      throw new Error("Response missing URL property");
    }
    
    return result.url;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    if (fetchError.name === 'AbortError') {
      throw new Error("Upload request timed out after 15 seconds");
    }
    throw fetchError;
  }
};
