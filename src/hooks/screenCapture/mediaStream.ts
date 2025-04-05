
import { ScreenCaptureConfig } from './types';
import { createLogger } from './logger';
import { MutableRefObject } from 'react';

const { logDebug, logError } = createLogger();

/**
 * Demande les permissions pour la capture d'écran
 */
export const requestMediaPermission = async (
  configRef: MutableRefObject<ScreenCaptureConfig>
): Promise<MediaStream | null> => {
  try {
    logDebug("Requesting screen capture permission...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error("Screen capture not supported in this browser");
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: configRef.current.useLowResolution ? 1280 : 1920 },
        height: { ideal: configRef.current.useLowResolution ? 720 : 1080 },
        frameRate: { ideal: configRef.current.requestFrameRate || 30 },
      },
    };

    if (configRef.current.captureWithAudio) {
      constraints.audio = true;
    }

    logDebug(`Requesting media with constraints: ${JSON.stringify(constraints)}`);

    // Demander la permission de capture d'écran à l'utilisateur
    const stream = await navigator.mediaDevices.getDisplayMedia(constraints);

    // Vérifier que le stream est valide
    if (!stream || !stream.active || stream.getTracks().length === 0) {
      logError("Stream obtained but appears invalid");
      return null;
    }

    // Ajouter des gestionnaires d'événements pour les pistes
    stream.getTracks().forEach(track => {
      logDebug(`Track obtained: ${track.kind}, label: ${track.label}, state: ${track.readyState}`);
      
      // Gérer l'événement de fin de piste (quand l'utilisateur arrête le partage)
      track.addEventListener('ended', () => {
        logDebug(`Track ${track.id} ended (user stopped sharing)`);
      });
      
      // Gérer les états de mute
      track.addEventListener('mute', () => {
        logDebug(`Track ${track.id} muted`);
      });
      
      track.addEventListener('unmute', () => {
        logDebug(`Track ${track.id} unmuted`);
      });
    });

    logDebug("Permission granted, stream obtained successfully");
    return stream;

  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      logError("User denied screen capture permission");
    } else {
      logError("Failed to obtain media stream");
    }
    return null;
  }
};

/**
 * Arrête toutes les pistes du stream média
 */
export const stopMediaTracks = (mediaStream: MediaStream | null): void => {
  if (!mediaStream) return;

  try {
    const tracks = mediaStream.getTracks();
    logDebug(`Stopping ${tracks.length} media tracks`);

    tracks.forEach(track => {
      try {
        if (track.readyState === "live") {
          track.stop();
          logDebug(`Stopped track: ${track.kind} (id: ${track.id})`);
        } else {
          logDebug(`Track ${track.id} already in state: ${track.readyState}`);
        }
      } catch (e) {
        logError(`Error stopping track ${track.id}`);
      }
    });
    
    logDebug("All tracks stopped successfully");
  } catch (error) {
    logError("Error while stopping media tracks");
  }
};
