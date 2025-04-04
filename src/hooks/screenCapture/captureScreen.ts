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
    logError("Capture prerequisites not met");
    return null;
  }

  if (!mediaStream?.active) return null;
  const videoTracks = mediaStream.getVideoTracks();
  if (!videoTracks.length) return null;

  const captureId = incrementCaptureCount();

  try {
    const video = await prepareVideoElement(mediaStream);
    const blob = await createCanvasFromVideo(video);
    cleanupResources(video);

    logDebug(`[Capture] 📸 Screenshot #${captureId}, size=${blob.size}`);
    const url = await uploadScreenshot(blob, captureId);

    if (!url) throw new Error("No URL returned from upload");

    setLastCaptureUrl(url);
    incrementSuccessCount();
    logDebug(`[Capture] ✅ Upload OK for #${captureId}`);
    return url;
  } catch (err) {
    logError(`[Capture] ❌ Screenshot #${captureId} failed`, err);
    incrementFailureCount();
    toast.error("La capture a échoué. Vérifie ta connexion.");
    return null;
  }
};
