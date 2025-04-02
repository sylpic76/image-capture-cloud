
import { createLogger } from './logger';
import { toast } from 'sonner';

const { logDebug, logError } = createLogger();

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

  try {
    const captureId = incrementCaptureCount();
    logDebug(`Starting screen capture #${captureId}`);
    
    const video = document.createElement('video');
    video.srcObject = mediaStream;
    video.muted = true;
    
    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        logDebug(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
        video.play();
        resolve(null);
      };
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    logDebug(`Drawn to canvas: ${canvas.width}x${canvas.height}`);
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          logDebug(`Created blob: type=${blob.type}, size=${blob.size} bytes`);
          resolve(blob);
        } else {
          toast.error("Échec de la création de l'image. Réessayez plus tard.");
          reject(new Error("Failed to create blob"));
        }
      }, 'image/png', 0.95);
    });

    const formData = new FormData();
    formData.append('screenshot', blob, 'screenshot.png');
    
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const requestUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-screenshot?t=${timestamp}`;
    
    logDebug(`Sending captured screenshot to: ${requestUrl}`);

    const response = await fetch(requestUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'X-Priority': 'high',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error uploading screenshot: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    logDebug(`Upload successful: ${result.url}`);
    setLastCaptureUrl(result.url);
    incrementSuccessCount();
    
    return result.url;
  } catch (error) {
    logError("Screen capture failed", error);
    toast.error("Échec de la capture d'écran. Réessayez plus tard.");
    incrementFailureCount();
    return null;
  }
};
