import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type ScreenCaptureStatus = 'idle' | 'requesting-permission' | 'active' | 'paused' | 'error';

export const useScreenCapture = (intervalSeconds = 5) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      setStatus('requesting-permission');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      });
      
      setMediaStream(stream);
      setStatus('active');
      toast.success("Capture d'écran activée. L'application peut maintenant capturer votre écran.");
      return true;
    } catch (error) {
      console.error("Erreur lors de la demande de permission:", error);
      setStatus('error');
      toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      return false;
    }
  }, []);

  const captureScreen = useCallback(async () => {
    if (!mediaStream || status !== 'active') {
      return null;
    }

    try {
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else {
            toast.error("Échec de la capture d'écran. Réessayez plus tard.");
            throw new Error("Failed to create blob");
          }
        }, 'image/png', 0.95);
      });

      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.png');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-screenshot`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'X-Priority': 'high',
        },
      });

      if (!response.ok) {
        throw new Error(`Error uploading screenshot: ${response.statusText}`);
      }

      const result = await response.json();
      setLastCaptureUrl(result.url);
      
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-screenshots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      
      return result.url;
    } catch (error) {
      console.error("Erreur de capture d'écran:", error);
      toast.error("Échec de la capture d'écran. Réessayez plus tard.");
      return null;
    }
  }, [mediaStream, status]);

  const toggleCapture = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      const permissionGranted = await requestPermission();
      if (permissionGranted) {
        setCountdown(intervalSeconds);
      }
    } else if (status === 'active') {
      setStatus('paused');
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused') {
      setStatus('active');
      setCountdown(intervalSeconds);
      toast.success("Capture d'écran reprise");
    }
  }, [status, requestPermission, intervalSeconds]);

  const stopCapture = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setStatus('idle');
  }, [mediaStream]);

  useEffect(() => {
    let timerId: number;

    if (status === 'active') {
      timerId = window.setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            captureScreen();
            return intervalSeconds;
          }
          return prevCount - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [status, captureScreen, intervalSeconds]);

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  return {
    status,
    countdown,
    toggleCapture,
    stopCapture,
    captureScreen,
    lastCaptureUrl,
  };
};
