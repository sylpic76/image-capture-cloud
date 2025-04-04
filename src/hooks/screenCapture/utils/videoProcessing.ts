
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Creates a video element and prepares it with the media stream
 */
export const prepareVideoElement = async (mediaStream: MediaStream): Promise<HTMLVideoElement> => {
  const video = document.createElement('video');
  video.srcObject = mediaStream;
  video.muted = true; // Toujours mettre en sourdine pour éviter le feedback audio
  
  // Journaliser les détails des pistes pour le débogage
  mediaStream.getVideoTracks().forEach(track => {
    logDebug(`Using video track: id=${track.id}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
    
    // Ajouter un gestionnaire pour détecter quand la piste se termine
    track.onended = () => {
      logDebug(`Video track ${track.id} ended`);
    };
  });
  
  // Utiliser une méthode plus fiable pour charger les métadonnées
  await new Promise<void>((resolve, reject) => {
    // Définir un délai d'attente pour éviter les problèmes de chargement
    const timeoutId = setTimeout(() => {
      reject(new Error("Video metadata loading timed out after 5 seconds"));
    }, 5000);
    
    // Événement déclenché lorsque les métadonnées sont chargées
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      logDebug(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
      resolve();
    };
    
    // Gestion des erreurs
    video.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    };
  });
  
  // Lire la vidéo pour s'assurer que le cadre est disponible
  try {
    await video.play();
    logDebug("Video playback started successfully");
  } catch (playError) {
    logError("Error playing video", playError);
    throw new Error(`Failed to play video: ${playError instanceof Error ? playError.message : String(playError)}`);
  }
  
  // Vérifier que la vidéo est vraiment prête à être capturée
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    const error = new Error("Video dimensions are zero, not ready for capture");
    logError("Video not ready for capture", error);
    throw error;
  }
  
  // Attendre un bref moment pour s'assurer que la vidéo est stable
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return video;
};

/**
 * Creates a canvas from a video element and returns the image blob
 */
export const createCanvasFromVideo = async (video: HTMLVideoElement): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  
  // S'assurer que les dimensions sont valides
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  
  canvas.width = width;
  canvas.height = height;
  
  logDebug(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  
  // Effacer le canvas avant de dessiner
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Dessiner avec try/catch pour capturer les erreurs de dessin
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    logDebug(`Successfully drawn video to canvas: ${canvas.width}x${canvas.height}`);
  } catch (drawError) {
    logError("Error drawing to canvas", drawError);
    throw new Error(`Canvas drawing failed: ${drawError instanceof Error ? drawError.message : String(drawError)}`);
  }
  
  // Créer un blob avec une qualité supérieure et une gestion de promesse fiable
  const blob = await new Promise<Blob>((resolve, reject) => {
    const blobTimeoutId = setTimeout(() => {
      reject(new Error("Blob creation timed out after 5 seconds"));
    }, 5000);
    
    canvas.toBlob((blob) => {
      clearTimeout(blobTimeoutId);
      if (blob) {
        logDebug(`Created blob: type=${blob.type}, size=${blob.size} bytes`);
        resolve(blob);
      } else {
        reject(new Error("Failed to create blob, result was null"));
      }
    }, 'image/png', 0.95); // Haute qualité pour PNG (0.95 est ignoré pour PNG mais utilisé pour JPEG)
  });
  
  // Vérifier la taille du blob - ne pas télécharger des blobs vides
  if (blob.size < 1000) {
    throw new Error(`Blob is too small (${blob.size} bytes), likely an empty or corrupt image`);
  }
  
  return blob;
};

/**
 * Cleanup resources after capture
 */
export const cleanupResources = (video: HTMLVideoElement): void => {
  try {
    video.pause();
    video.srcObject = null;
    // Forcer la récupération de mémoire
    URL.revokeObjectURL(video.src);
    logDebug("Video resources cleaned up successfully");
  } catch (error) {
    logError("Error during cleanup", error);
  }
};
