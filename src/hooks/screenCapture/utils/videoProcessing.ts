
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Create a video element and prepare it with the media stream
 */
export const prepareVideoElement = async (mediaStream: MediaStream): Promise<HTMLVideoElement> => {
  const video = document.createElement('video');
  video.srcObject = mediaStream;
  video.autoplay = true;
  video.muted = true;
  video.style.position = 'fixed';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';
  document.body.appendChild(video);

  // Wait for the video to be ready
  await new Promise<void>((resolve, reject) => {
    // Set a timeout to prevent infinite waiting
    const timeout = setTimeout(() => {
      logError("[videoProcessing] Timeout waiting for video to load");
      reject(new Error("Video load timeout"));
    }, 5000);

    // Add handlers for successful load and error
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      video.play()
        .then(() => {
          // Add a small delay to ensure the frame is ready
          setTimeout(resolve, 100);
        })
        .catch(err => {
          clearTimeout(timeout);
          logError(`[videoProcessing] Error playing video: ${err instanceof Error ? err.message : String(err)}`);
          reject(err);
        });
    };

    video.onerror = (err) => {
      clearTimeout(timeout);
      logError(`[videoProcessing] Error loading video: ${err instanceof Event ? 'Event error' : String(err)}`);
      reject(err);
    };
  });

  return video;
};

/**
 * Create a canvas from a video element and convert it to a blob
 */
export const createCanvasFromVideo = async (video: HTMLVideoElement): Promise<Blob> => {
  // Create canvas with the video dimensions
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  logDebug(`[videoProcessing] Creating canvas ${canvas.width}x${canvas.height}`);

  // Draw the video frame on the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Unable to get canvas context");
  }
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Convert canvas to blob
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas.toBlob produced null result"));
            return;
          }
          resolve(blob);
        },
        'image/png',
        0.9 // quality
      );
    } catch (err) {
      logError(`[videoProcessing] Error converting canvas to blob: ${err instanceof Error ? err.message : String(err)}`);
      reject(err);
    }
  });
};

/**
 * Clean up resources after capture
 */
export const cleanupResources = (video: HTMLVideoElement): void => {
  try {
    // Remove video element from DOM
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
    
    // Stop all tracks in the srcObject if it's a MediaStream
    if (video.srcObject instanceof MediaStream) {
      const stream = video.srcObject;
      stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          // Don't stop the track, just release it from this element
          // because we're still using it in the main mediaStreamRef
        }
      });
    }
    
    // Clear srcObject to release resources
    video.srcObject = null;
    
    logDebug("[videoProcessing] Resources cleaned up successfully");
  } catch (err) {
    logError(`[videoProcessing] Error cleaning up resources: ${err instanceof Error ? err.message : String(err)}`);
  }
};
