
import { toast } from 'sonner';
import { createLogger } from './logger';
import { validateCapturePrerequisites } from './utils/mediaValidation';
import { prepareVideoElement, createCanvasFromVideo, cleanupResources } from './utils/videoProcessing';
import { uploadScreenshot } from './utils/uploadUtils';

const { logDebug, logError } = createLogger();

export const captureScreen = async (
  mediaStream: MediaStream | null,
  status: string,
  incrementCaptureCount: () => number,
  incrementSuccessCount: () => void,
  incrementFailureCount: () => void,
  setLastCaptureUrl: (url: string) => void
): Promise<string | null> => {
  // Valider les prérequis pour la capture d'écran
  if (!validateCapturePrerequisites(mediaStream, status)) {
    logError("[captureScreen] Prerequisites failed: Invalid mediaStream or status");
    return null;
  }

  if (!mediaStream?.active) {
    logError("[captureScreen] Stream is null or inactive");
    return null;
  }

  const videoTracks = mediaStream.getVideoTracks();
  if (videoTracks.length === 0) {
    logError("[captureScreen] No video tracks found in stream");
    return null;
  }

  logDebug(`[captureScreen] Stream active: ${mediaStream.active}, Video tracks: ${videoTracks.length}`);
  
  // Log details about each track
  videoTracks.forEach((track, i) => {
    logDebug(`[captureScreen] Track ${i}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
  });

  let retryCount = 0;
  const maxRetries = 1;

  while (retryCount <= maxRetries) {
    try {
      const captureId = incrementCaptureCount();
      logDebug(`[captureScreen] Starting capture #${captureId} (try ${retryCount + 1})`);

      // Créer un élément vidéo et préparer le canvas pour la capture
      const video = await prepareVideoElement(mediaStream);
      logDebug(`[captureScreen] Video element prepared: ${video.videoWidth}x${video.videoHeight}`);
      
      // Créer le blob à partir du canvas
      const blob = await createCanvasFromVideo(video);
      logDebug(`[captureScreen] Canvas created and converted to blob: ${blob.size} bytes`);
      
      // Nettoyer les ressources
      cleanupResources(video);

      // Uploader le screenshot
      logDebug(`[captureScreen] Starting upload for capture #${captureId}, blob size=${blob.size}, type=${blob.type}`);
      const url = await uploadScreenshot(blob, captureId);
      
      if (!url) {
        throw new Error("Upload returned no URL");
      }

      // Mettre à jour l'URL de la dernière capture
      setLastCaptureUrl(url);
      incrementSuccessCount();

      logDebug(`[captureScreen] ✅ Capture #${captureId} completed and uploaded: ${url}`);
      return url;
      
    } catch (error) {
      retryCount++;
      logError(`[captureScreen] Capture failed (attempt ${retryCount}/${maxRetries + 1})`, error);
      
      if (retryCount > maxRetries) {
        incrementFailureCount();
        toast.error("Échec de la capture d'écran. Réessayez plus tard.");
        return null;
      }
      
      // Attendre avant de réessayer
      await new Promise(res => setTimeout(res, 1000 * retryCount));
    }
  }

  return null;
};
