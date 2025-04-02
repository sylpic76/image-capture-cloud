
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Creates a video element and prepares it with the media stream
 */
export const prepareVideoElement = async (mediaStream: MediaStream): Promise<HTMLVideoElement> => {
  const video = document.createElement('video');
  video.srcObject = mediaStream;
  video.muted = true;
  
  // Log track details for debugging
  mediaStream.getVideoTracks().forEach(track => {
    logDebug(`Using video track: id=${track.id}, enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
  });
  
  // Use more reliable loading method with reduced timeout
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Video metadata loading timed out after 3 seconds"));
    }, 3000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      logDebug(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
      resolve();
    };
    
    video.onerror = (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Video loading error: ${err}`));
    };
  });
  
  // Play the video to ensure frame is available
  try {
    await video.play();
    logDebug("Video playback started successfully");
  } catch (playError) {
    logError("Error playing video", playError);
    throw new Error(`Failed to play video: ${playError}`);
  }
  
  // Vérifie que la vidéo est vraiment prête à être capturée
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    const error = new Error("Video dimensions are zero, not ready for capture");
    logError("Video not ready for capture", error);
    throw error;
  }
  
  return video;
};

/**
 * Creates a canvas from a video element and returns the image blob
 */
export const createCanvasFromVideo = async (video: HTMLVideoElement): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  
  // Make sure dimensions are valid
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  
  canvas.width = width;
  canvas.height = height;
  
  logDebug(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  
  // Clear canvas before drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw with try/catch to catch any drawing errors
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    logDebug(`Drawn to canvas: ${canvas.width}x${canvas.height}`);
  } catch (drawError) {
    logError("Error drawing to canvas", drawError);
    throw new Error(`Canvas drawing failed: ${drawError}`);
  }
  
  // Create blob with higher quality and reliable promise handling
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
    }, 'image/png', 0.95);
  });
  
  // Check blob size - don't upload empty blobs
  if (blob.size < 1000) {
    throw new Error(`Blob is too small (${blob.size} bytes), likely an empty or corrupt image`);
  }
  
  return blob;
};

/**
 * Cleanup resources after capture
 */
export const cleanupResources = (video: HTMLVideoElement): void => {
  video.pause();
  video.srcObject = null;
};
