
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
    logError("Capture prerequisites not met", new Error("Invalid media stream or status"));
    return null;
  }
  
  // Extra validation for mediaStream
  if (!mediaStream.active) {
    logError("MediaStream is no longer active", new Error("MediaStream inactive"));
    return null;
  }
  
  const videoTracks = mediaStream.getVideoTracks();
  if (videoTracks.length === 0) {
    logError("No video tracks found", new Error("No video tracks"));
    return null;
  }
  
  // Log details of all tracks before capturing
  videoTracks.forEach(track => {
    logDebug(`Video track status before capture: id=${track.id}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
  });
  
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
      
      // Upload screenshot - add extra debug information
      logDebug(`Attempting to upload screenshot #${captureId}, blob size: ${blob.size}, type: ${blob.type}`);
      
      // Upload screenshot
      const url = await uploadScreenshot(blob, captureId);
      
      if (!url) {
        throw new Error("Screenshot upload failed - no URL returned");
      }
      
      // Update state with successful capture
      setLastCaptureUrl(url);
      incrementSuccessCount();
      
      // Log de la capture réussie
      logDebug(`✅ Capture #${captureId} envoyée à Supabase @${new Date().toISOString()}`);
      console.log(`Capture #${captureId} envoyée à Supabase @`, new Date().toISOString());
      
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
