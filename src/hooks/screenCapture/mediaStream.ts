
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
    
    // Configuration optimisée pour la capture d'écran
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: configRef.current.useLowResolution ? 1280 : 1920 },
        height: { ideal: configRef.current.useLowResolution ? 720 : 1080 },
        frameRate: { ideal: configRef.current.requestFrameRate || 30 },
      }
    };
    
    logDebug(`Requesting media with constraints: ${JSON.stringify(constraints)}`);
    
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
    if (!stream || !stream.active || stream.getTracks().length === 0) {
      throw new Error("Stream obtained but appears to be invalid");
    }
    
    // Log detailed info about each track
    stream.getTracks().forEach(track => {
      logDebug(`Track obtained: id=${track.id}, kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, muted=${track.muted}`);
      
      // Add track ended listener to handle when user stops sharing
      track.addEventListener('ended', () => {
        logDebug(`Track ${track.id} ended by user or system`);
      });
    });
    
    logDebug("Permission granted, stream obtained successfully");
    return stream;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      logError("User denied permission to capture screen", error);
    } else {
      logError("Failed to obtain media stream", error);
    }
    return null;
  }
};

export const stopMediaTracks = (mediaStream: MediaStream | null): void => {
  if (!mediaStream) return;
  
  logDebug(`Stopping ${mediaStream.getTracks().length} media tracks`);
  mediaStream.getTracks().forEach(track => {
    try {
      logDebug(`Stopping track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}`);
      track.stop();
    } catch (e) {
      logError(`Error stopping track ${track.id}`, e);
    }
  });
};
