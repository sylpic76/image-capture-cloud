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
  if (!validateCapturePrerequisites(mediaStream, status)) {
    logError("[captureScreen] Prerequisites failed");
    return null;
  }

  if (!mediaStream?.active) {
    logError("[captureScreen] Stream is null or inactive");
    return null;
  }

  const videoTracks = mediaStream.getVideoTracks();
  if (videoTracks.length === 0) {
    logError("[captureScreen] No video tracks found");
    return null;
  }

  let retryCount = 0;
  const maxRetries = 1;

  while (retryCount <= maxRetries) {
    try {
      const captureId = incrementCaptureCount();
      logDebug(`[captureScreen] Capture #${captureId} (try ${retryCount + 1})`);

      const video = await prepareVideoElement(mediaStream);
      const blob = await createCanvasFromVideo(video);
      cleanupResources(video);

      logDebug(`[captureScreen] Blob created, size=${blob.size}, type=${blob.type}`);

      const url = await uploadScreenshot(blob, captureId);
      if (!url) throw new Error("Upload returned no URL");

      setLastCaptureUrl(url);
      incrementSuccessCount();

      logDebug(`[captureScreen] ✅ Capture #${captureId} uploaded: ${url}`);
      return url;
    } catch (error) {
      retryCount++;
      logError(`[captureScreen] Capture failed (${retryCount})`, error);
      if (retryCount > maxRetries) {
        incrementFailureCount();
        toast.error("Échec de la capture d'écran.");
        return null;
      }
      await new Promise(res => setTimeout(res, 1000 * retryCount));
    }
  }

  return null;
};
