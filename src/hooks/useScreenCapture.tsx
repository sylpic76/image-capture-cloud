
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export type ScreenCaptureStatus = 'idle' | 'requesting-permission' | 'active' | 'paused' | 'error';

// Set the default interval to 5 seconds
export const useScreenCapture = (intervalSeconds = 5) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);

  const logDebug = (message: string) => {
    console.log(`[useScreenCapture] ${message}`);
  };

  const logError = (message: string, error: any) => {
    console.error(`[useScreenCapture ERROR] ${message}:`, error);
    setLastError(error instanceof Error ? error : new Error(String(error)));
    failureCountRef.current++;
  };

  const requestPermission = useCallback(async () => {
    try {
      logDebug("Requesting screen capture permission...");
      setStatus('requesting-permission');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      
      logDebug("Permission granted, stream obtained");
      logDebug(`Stream tracks: ${stream.getTracks().length}, active: ${stream.active}`);
      
      setMediaStream(stream);
      setStatus('active');
      toast.success("Capture d'écran activée. L'application peut maintenant capturer votre écran.");
      return true;
    } catch (error) {
      logError("Permission request failed", error);
      setStatus('error');
      toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      return false;
    }
  }, []);

  const captureScreen = useCallback(async () => {
    if (!mediaStream || status !== 'active') {
      logDebug(`Cannot capture: mediaStream=${!!mediaStream}, status=${status}`);
      return null;
    }

    try {
      captureCountRef.current++;
      const captureId = captureCountRef.current;
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
        logError(`HTTP error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error uploading screenshot: ${response.statusText}`);
      }

      const result = await response.json();
      logDebug(`Upload successful: ${result.url}`);
      setLastCaptureUrl(result.url);
      successCountRef.current++;
      
      return result.url;
    } catch (error) {
      logError("Screen capture failed", error);
      toast.error("Échec de la capture d'écran. Réessayez plus tard.");
      return null;
    }
  }, [mediaStream, status]);

  const toggleCapture = useCallback(async () => {
    logDebug(`Toggle capture called, current status: ${status}`);
    
    if (status === 'idle' || status === 'error') {
      const permissionGranted = await requestPermission();
      if (permissionGranted) {
        logDebug("Permission granted, setting countdown");
        setCountdown(intervalSeconds);
      }
    } else if (status === 'active') {
      logDebug("Pausing capture");
      setStatus('paused');
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused') {
      logDebug("Resuming capture");
      setStatus('active');
      setCountdown(intervalSeconds);
      toast.success("Capture d'écran reprise");
    }
  }, [status, requestPermission, intervalSeconds]);

  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    if (mediaStream) {
      logDebug(`Stopping ${mediaStream.getTracks().length} media tracks`);
      mediaStream.getTracks().forEach(track => {
        logDebug(`Stopping track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}`);
        track.stop();
      });
      setMediaStream(null);
    }
    
    setStatus('idle');
    logDebug("Capture stopped, status set to idle");
  }, [mediaStream]);

  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status]);

  useEffect(() => {
    let timerId: number;

    if (status === 'active') {
      logDebug(`Starting countdown timer with interval: ${intervalSeconds}s`);
      
      timerId = window.setInterval(() => {
        setCountdown(prevCount => {
          const newCount = prevCount <= 1 ? intervalSeconds : prevCount - 1;
          logDebug(`Countdown: ${prevCount} -> ${newCount}`);
          
          if (prevCount <= 1) {
            logDebug("Countdown reached zero, capturing screen");
            captureScreen();
          }
          
          return newCount;
        });
      }, 1000);
    }

    return () => {
      if (timerId) {
        logDebug("Clearing countdown timer");
        clearInterval(timerId);
      }
    };
  }, [status, captureScreen, intervalSeconds]);

  useEffect(() => {
    return () => {
      logDebug("Component unmounting, cleaning up media stream");
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // Monitor browser console for unhandled fetch errors
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        if (args[0] && String(args[0]).includes('capture-screenshot')) {
          logError("Fetch error in screen capture", error);
          toast.error("Erreur réseau lors de la capture d'écran. Vérifiez votre connexion.");
        }
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Get diagnostic information
  const getDiagnostics = useCallback(() => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStream,
      lastError: lastError?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      browserInfo: navigator.userAgent
    };
  }, [status, countdown, mediaStream, lastError]);

  return {
    status,
    countdown,
    toggleCapture,
    stopCapture,
    captureScreen,
    lastCaptureUrl,
    getDiagnostics
  };
};
