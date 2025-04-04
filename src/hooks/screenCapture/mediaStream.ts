
import { ScreenCaptureConfig } from './types';
import { createLogger } from './logger';
import { useRef } from 'react';

const { logDebug, logError } = createLogger();

/**
 * Fonction améliorée pour demander les permissions avec meilleure gestion d'erreurs
 */
export const requestMediaPermission = async (
  configRef: React.RefObject<ScreenCaptureConfig>
): Promise<MediaStream | null> => {
  try {
    logDebug("Requesting screen capture permission...");
    
    if (!configRef.current) {
      throw new Error("Configuration not initialized");
    }
    
    // Vérifier si la fonctionnalité est disponible dans le navigateur
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Screen capture not supported in this browser");
    }
    
    // Configuration optimisée pour la capture d'écran - réduire les contraintes
    const constraints: MediaStreamConstraints = {
      video: {
        // Utiliser des contraintes minimales pour maximiser la compatibilité
        width: { ideal: configRef.current.useLowResolution ? 1280 : 1920 },
        height: { ideal: configRef.current.useLowResolution ? 720 : 1080 },
        frameRate: { ideal: configRef.current.requestFrameRate || 30 },
      }
    };
    
    // Inclure l'audio si demandé dans la configuration
    if (configRef.current.captureWithAudio) {
      constraints.audio = true;
    }
    
    logDebug(`Requesting media with constraints: ${JSON.stringify(constraints)}`);
    
    try {
      // Demander l'accès au media - pas de timeout car bloqué par l'UI du navigateur
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      if (!stream || !stream.active || stream.getTracks().length === 0) {
        logError("Stream obtained but appears to be invalid", new Error("Invalid stream"));
        return null;
      }
      
      // Log detailed info about each track
      stream.getTracks().forEach(track => {
        logDebug(`Track obtained: id=${track.id}, kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
        
        // Add track ended listener to handle when user stops sharing
        track.addEventListener('ended', () => {
          logDebug(`Track ${track.id} ended by user or system`);
        });
      });
      
      logDebug("Permission granted, stream obtained successfully");
      return stream;
    } catch (e) {
      // Si l'erreur est liée aux contraintes, réessayer avec des contraintes minimales
      if (e instanceof DOMException && 
          (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError')) {
        logDebug("Constraints not satisfied, retrying with minimal constraints");
        try {
          const fallbackStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          
          if (!fallbackStream || !fallbackStream.active) {
            logError("Fallback stream failed to initialize", new Error("Fallback stream invalid"));
            return null;
          }
          
          logDebug("Fallback stream obtained successfully");
          return fallbackStream;
        } catch (fallbackError) {
          // Si même la tentative de fallback échoue
          logError("Fallback attempt failed", fallbackError);
          throw fallbackError; // Rethrow to be handled by the caller
        }
      } else {
        throw e; // Rethrow to be handled by the caller
      }
    }
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          logError("User denied permission to capture screen", error);
          break;
        case 'NotFoundError':
          logError("No suitable screen capture source found", error);
          break;
        case 'NotReadableError':
          logError("Could not read from the selected source (hardware error)", error);
          break;
        case 'AbortError':
          logError("User aborted the screen capture", error);
          break;
        default:
          logError(`Screen capture error: ${error.name}`, error);
      }
    } else {
      logError("Failed to obtain media stream", error);
    }
    throw error; // Always throw to let the caller handle the error
  }
};

/**
 * Fonction améliorée pour arrêter les pistes média avec plus de robustesse
 */
export const stopMediaTracks = (mediaStream: MediaStream | null): void => {
  if (!mediaStream) return;
  
  const trackCount = mediaStream.getTracks().length;
  logDebug(`Stopping ${trackCount} media tracks`);
  
  mediaStream.getTracks().forEach(track => {
    try {
      logDebug(`Stopping track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, readyState=${track.readyState}`);
      
      // Vérifier si la piste est déjà arrêtée
      if (track.readyState !== "live") {
        logDebug(`Track ${track.id} already ended, skipping`);
        return;
      }
      
      // Essayer d'activer la piste avant de l'arrêter pour éviter certaines erreurs
      if (!track.enabled) {
        track.enabled = true;
      }
      
      // Arrêter la piste
      track.stop();
      
      // Vérifier si elle a été correctement arrêtée
      if (track.readyState === "live") {
        logError(`Failed to stop track ${track.id}, readyState: ${track.readyState}`, new Error("Track could not be stopped"));
      } else {
        logDebug(`Successfully stopped track ${track.id}`);
      }
    } catch (e) {
      logError(`Error stopping track ${track.id}`, e);
    }
  });
};
