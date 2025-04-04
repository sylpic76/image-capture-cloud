import { ScreenCaptureConfig } from './types';
import { createLogger } from './logger';

const { logDebug, logError } = createLogger();

/**
 * Demande les permissions pour la capture d’écran
 */
export const requestMediaPermission = async (
  config: ScreenCaptureConfig
): Promise<MediaStream | null> => {
  try {
    logDebug("Requesting screen capture permission...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Screen capture not supported in this browser");
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: config.useLowResolution ? 1280 : 1920 },
        height: { ideal: config.useLowResolution ? 720 : 1080 },
        frameRate: { ideal: config.requestFrameRate || 30 },
      },
    };

    if (config.captureWithAudio) {
      constraints.audio = true;
    }

    logDebug(`Requesting media with constraints: ${JSON.stringify(constraints)}`);

    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

    if (!stream || !stream.active || stream.getTracks().length === 0) {
      logError("Stream obtained but appears invalid");
      return null;
    }

    stream.getTracks().forEach(track => {
      logDebug(`Track obtained: ${track.kind}, label: ${track.label}`);
      track.addEventListener('ended', () => {
        logDebug(`Track ${track.id} ended`);
      });
    });

    logDebug("Permission granted, stream obtained successfully");
    return stream;

  } catch (error) {
    logError("Failed to obtain media stream", error);
    return null;
  }
};

/**
 * Arrête toutes les pistes
 */
export const stopMediaTracks = (mediaStream: MediaStream | null): void => {
  if (!mediaStream) return;

  mediaStream.getTracks().forEach(track => {
    try {
      if (track.readyState === "live") {
        track.stop();
        logDebug(`Stopped track: ${track.kind}`);
      }
    } catch (e) {
      logError("Error stopping track", e);
    }
  });
};
