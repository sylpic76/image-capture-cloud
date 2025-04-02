
import { toast } from 'sonner';
import { createLogger } from './logger';
import { validateCapturePrerequisites } from './utils/mediaValidation';
import { prepareVideoElement, createCanvasFromVideo, cleanupResources } from './utils/videoProcessing';
import { uploadScreenshot } from './utils/uploadUtils';

const { logDebug, logError } = createLogger();

/**
 * Main capture function with retry mechanism
 */
export const captureScreen = async (
  mediaStream: MediaStream | null,
  status: string,
  incrementCaptureCount: () => number,
  incrementSuccessCount: () => void,
  incrementFailureCount: () => void,
  setLastCaptureUrl: (url: string) => void
): Promise<string | null> => {
  // Check if capture can be performed
  if (!validateCapturePrerequisites(mediaStream, status)) {
    return null;
  }
  
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const captureId = incrementCaptureCount();
      logDebug(`Starting screen capture #${captureId}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);
      
      // Re-verify stream is active before proceeding
      if (!mediaStream.active) {
        throw new Error("MediaStream is no longer active");
      }
      
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video tracks found in MediaStream");
      }
      
      // Verify if tracks are still usable
      const activeTracks = videoTracks.filter(track => track.readyState === "live");
      if (activeTracks.length === 0) {
        throw new Error("No active video tracks available, all tracks are in 'ended' state");
      }
      
      // Prepare video element
      const video = await prepareVideoElement(mediaStream);
      
      // Create canvas and get blob
      const blob = await createCanvasFromVideo(video);
      
      // Clean up video resources
      cleanupResources(video);
      
      // Upload screenshot
      const url = await uploadScreenshot(blob, captureId);
      
      // Update state with successful capture
      setLastCaptureUrl(url);
      incrementSuccessCount();
      
      // Log de la capture réussie
      logDebug("✅ Capture envoyée à Supabase @" + new Date().toISOString());
      console.log("Capture envoyée à Supabase @", new Date().toISOString());
      
      return url;
    } catch (error) {
      logError(`Screen capture failed (attempt ${retryCount + 1}/${maxRetries + 1})`, error);
      
      retryCount++;
      
      if (retryCount > maxRetries) {
        incrementFailureCount();
        // Only show error toast after all retries have failed, not for every retry
        toast.error("La capture d'écran a échoué après plusieurs tentatives. Vérifiez votre connexion réseau et réessayez.");
        return null;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(1.5, retryCount), 3000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      logDebug(`Retrying capture, attempt ${retryCount}/${maxRetries} after waiting ${waitTime}ms`);
    }
  }
  
  return null;
};
