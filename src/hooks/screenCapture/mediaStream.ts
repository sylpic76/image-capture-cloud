
import { ScreenCaptureConfig } from './types';
import { createLogger } from './logger';

const { logDebug, logError } = createLogger();

export const requestMediaPermission = async (
  configRef: React.RefObject<ScreenCaptureConfig>
): Promise<MediaStream | null> => {
  try {
    logDebug("Requesting screen capture permission...");
    
    if (!configRef.current) {
      throw new Error("Configuration not initialized");
    }
    
    // Configuration moins restrictive pour la capture d'écran
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: configRef.current.requestFrameRate || 30,
      }
    };
    
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
    logDebug("Permission granted, stream obtained");
    logDebug(`Stream tracks: ${stream.getTracks().length}, active: ${stream.active}`);
    
    return stream;
  } catch (error) {
    logError("Permission request failed", error);
    return null;
  }
};

export const stopMediaTracks = (mediaStream: MediaStream | null): void => {
  if (!mediaStream) return;
  
  logDebug(`Stopping ${mediaStream.getTracks().length} media tracks`);
  mediaStream.getTracks().forEach(track => {
    logDebug(`Stopping track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}`);
    track.stop();
  });
};
