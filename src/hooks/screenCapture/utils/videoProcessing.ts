
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Prepare a video element with the media stream
 */
export const prepareVideoElement = async (mediaStream: MediaStream): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      
      // Set attributes needed for capture
      video.setAttribute('autoplay', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.position = 'absolute';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.zIndex = '-1';
      
      // Add to DOM temporarily (some browsers need this)
      document.body.appendChild(video);
      
      // Set up event handlers
      const onLoadedMetadata = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.play()
          .then(() => {
            setTimeout(() => resolve(video), 300); // Short delay for stability
          })
          .catch(playError => {
            const errorMessage = `Failed to play video: ${playError instanceof Error ? playError.message : 'Unknown error'}`;
            logError(errorMessage);
            reject(new Error(errorMessage));
          });
      };
      
      const onError = (err: Event | string) => {
        let errorMessage = 'Unknown video error';
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err instanceof Event) {
          errorMessage = `Video error: ${err.type}`;
        }
        logError(errorMessage);
        reject(new Error(errorMessage));
      };
      
      // Set up event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      
      // Set the source
      video.srcObject = mediaStream;
      
      logDebug(`Video element prepared with dimensions: ${video.videoWidth}x${video.videoHeight}`);
    } catch (error) {
      const errorMessage = `Failed to prepare video element: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
};

/**
 * Create a canvas from the video feed and convert to a blob
 */
export const createCanvasFromVideo = async (video: HTMLVideoElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Get dimensions
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (!width || !height) {
        const errorMessage = `Invalid video dimensions: ${width}x${height}`;
        logError(errorMessage);
        return reject(new Error(errorMessage));
      }
      
      // Create canvas at the same size as the video
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const errorMessage = 'Failed to get canvas context';
        logError(errorMessage);
        return reject(new Error(errorMessage));
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const errorMessage = 'Failed to create blob from canvas';
            logError(errorMessage);
            return reject(new Error(errorMessage));
          }
          resolve(blob);
        },
        'image/png',
        0.9 // Quality
      );
    } catch (error) {
      const errorMessage = `Failed to create canvas from video: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logError(errorMessage);
      reject(new Error(errorMessage));
    }
  });
};

/**
 * Clean up resources after capture
 */
export const cleanupResources = (video: HTMLVideoElement): void => {
  try {
    // Stop all tracks in the video stream
    if (video.srcObject instanceof MediaStream) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => {
        // Don't actually stop the tracks, just disconnect from video
        try {
          track.enabled = true; // Make sure enabled before disconnecting
        } catch (e) {
          logDebug(`Error resetting track: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      });
    }
    
    // Clean up video element
    video.pause();
    video.srcObject = null;
    
    // Remove from DOM if it was added
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
    
    logDebug('Video resources cleaned up');
  } catch (error) {
    const errorMessage = `Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logError(errorMessage);
  }
};
