
import { createLogger } from './logger';
import { toast } from 'sonner';

const { logDebug, logError } = createLogger();

// Enhanced version with better error handling and retry mechanism
export const captureScreen = async (
  mediaStream: MediaStream | null,
  status: string,
  incrementCaptureCount: () => number,
  incrementSuccessCount: () => void,
  incrementFailureCount: () => void,
  setLastCaptureUrl: (url: string) => void
): Promise<string | null> => {
  if (!mediaStream || status !== 'active') {
    logDebug(`Cannot capture: mediaStream=${!!mediaStream}, status=${status}`);
    return null;
  }

  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      const captureId = incrementCaptureCount();
      logDebug(`Starting screen capture #${captureId}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);
      
      // Verify stream is active before proceeding
      if (!mediaStream.active) {
        throw new Error("MediaStream is no longer active");
      }
      
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video tracks found in MediaStream");
      }
      
      // Log track details for debugging
      videoTracks.forEach(track => {
        logDebug(`Using video track: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
      });
      
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      
      // Use more reliable loading method
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Video metadata loading timed out after 5 seconds"));
        }, 5000);
        
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
      } catch (playError) {
        logError("Error playing video", playError);
        throw new Error(`Failed to play video: ${playError}`);
      }

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
      
      // Stop video playing to release resources
      video.pause();
      
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

      const formData = new FormData();
      formData.append('screenshot', blob, `screenshot_${Date.now()}.png`);
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const requestUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-screenshot?t=${timestamp}`;
      
      logDebug(`Sending captured screenshot to: ${requestUrl}`);
      
      // Use more robust fetch with timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'X-Priority': 'high',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        logDebug(`Upload successful: ${result.url}`);
        
        if (!result.url) {
          throw new Error("Response missing URL property");
        }
        
        setLastCaptureUrl(result.url);
        incrementSuccessCount();
        
        return result.url;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error("Upload request timed out after 15 seconds");
        }
        throw fetchError;
      }
    } catch (error) {
      logError(`Screen capture failed (attempt ${retryCount + 1}/${maxRetries + 1})`, error);
      
      retryCount++;
      
      if (retryCount > maxRetries) {
        incrementFailureCount();
        toast.error("La capture d'écran a échoué après plusieurs tentatives. Vérifiez votre connexion réseau et réessayez.");
        return null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      logDebug(`Retrying capture, attempt ${retryCount}/${maxRetries}`);
    }
  }
  
  return null;
};
