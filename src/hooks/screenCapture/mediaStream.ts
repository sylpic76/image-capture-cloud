
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
    
    // Configuration restreinte pour la capture d'écran
    const constraints: MediaStreamConstraints = {
      video: {
        width: configRef.current.useLowResolution ? { ideal: 1280 } : { ideal: 1920 },
        height: configRef.current.useLowResolution ? { ideal: 720 } : { ideal: 1080 },
        frameRate: configRef.current.requestFrameRate,
      }
    };
    
    // Utilisation d'une API plus basique si configuré ainsi
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
    // Désactiver certaines fonctionnalités avancées des pistes si nécessaire
    if (configRef.current.disableAdvancedSDK && stream.getTracks().length > 0) {
      stream.getTracks().forEach(track => {
        // Désactiver certaines capacités avancées qui pourraient causer des problèmes de permission
        if (track.getConstraints && typeof track.getConstraints === 'function') {
          try {
            // Utiliser seulement les contraintes de base
            track.applyConstraints({
              advanced: [] // Supprimer toutes les contraintes avancées
            }).catch(e => logDebug(`Contraintes simplifiées: ${e}`));
          } catch (e) {
            logDebug(`Impossible d'appliquer les contraintes simplifiées: ${e}`);
          }
        }
      });
    }
    
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
