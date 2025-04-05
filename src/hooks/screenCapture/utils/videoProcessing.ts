
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Create and prepare a video element from a media stream
 */
export const prepareVideoElement = async (mediaStream: MediaStream): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      
      // Configure video element
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = mediaStream;
      
      // When the video starts playing, we can capture it
      video.onplaying = () => {
        logDebug(`Video element ready: ${video.videoWidth}x${video.videoHeight}`);
        resolve(video);
      };
      
      // Handle errors
      video.onerror = (event) => {
        const errorMessage = `Error initializing video element: ${event.type}`;
        logError(errorMessage);
        reject(new Error(errorMessage));
      };
      
      // Start playing the video
      video.play().catch(err => {
        const errorMessage = `Failed to play video: ${err.message}`;
        logError(errorMessage);
        reject(new Error(errorMessage));
      });
      
      // Set a timeout in case onplaying never fires
      setTimeout(() => {
        if (video.readyState < 3) { // HAVE_FUTURE_DATA
          const errorMessage = 'Video element timed out while initializing';
          logError(errorMessage);
          reject(new Error(errorMessage));
        }
      }, 5000);
    } catch (err) {
      const errorMessage = `Failed to create video element: ${err instanceof Error ? err.message : 'Unknown error'}`;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
};

/**
 * Create a canvas from the video and return as a blob
 */
export const createCanvasFromVideo = async (video: HTMLVideoElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure video dimensions are valid
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        const errorMessage = 'Invalid video dimensions: Width or height is zero';
        logError(errorMessage);
        reject(new Error(errorMessage));
        return;
      }
      
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const errorMessage = 'Failed to get canvas context';
        logError(errorMessage);
        reject(new Error(errorMessage));
        return;
      }
      
      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const errorMessage = 'Failed to convert canvas to blob';
            logError(errorMessage);
            reject(new Error(errorMessage));
            return;
          }
          resolve(blob);
        },
        'image/png',
        0.95 // Quality (0-1)
      );
    } catch (err) {
      const errorMessage = `Error creating canvas from video: ${err instanceof Error ? err.message : 'Unknown error'}`;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
};

/**
 * Clean up resources used by the video element
 */
export const cleanupResources = (video: HTMLVideoElement) => {
  try {
    // Stop the video
    video.pause();
    
    // Remove the stream
    if (video.srcObject instanceof MediaStream) {
      video.srcObject = null;
    }
    
    // Remove event listeners
    video.onplaying = null;
    video.onerror = null;
    
    logDebug('Video resources cleaned up');
  } catch (err) {
    const errorMessage = `Error cleaning up video resources: ${err instanceof Error ? err.message : 'Unknown error'}`;
    logError(errorMessage);
  }
};
