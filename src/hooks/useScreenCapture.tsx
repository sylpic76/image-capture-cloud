
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type ScreenCaptureStatus = 'idle' | 'requesting-permission' | 'active' | 'paused' | 'error';

export const useScreenCapture = (intervalSeconds = 30) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  // Request screen capture permission
  const requestPermission = useCallback(async () => {
    try {
      setStatus('requesting-permission');
      
      // Request the user's screen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          mediaSource: "screen",
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

  // Capture the screen
  const captureScreen = useCallback(async () => {
    if (!mediaStream || status !== 'active') {
      return null;
    }

    try {
      // Create a video element to capture a frame from the stream
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      
      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });

      // Create a canvas to draw the frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current frame
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else {
            toast.error("Échec de la capture d'écran. Réessayez plus tard.");
            throw new Error("Failed to create blob");
          }
        }, 'image/png');
      });

      // Create form data for the upload
      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.png');

      // Upload to Supabase via our edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-screenshot`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error uploading screenshot: ${response.statusText}`);
      }

      const result = await response.json();
      setLastCaptureUrl(result.url);
      toast.success("Capture d'écran enregistrée avec succès");
      return result.url;
    } catch (error) {
      console.error("Erreur de capture d'écran:", error);
      toast.error("Échec de la capture d'écran. Réessayez plus tard.");
      return null;
    }
  }, [mediaStream, status]);

  // Toggle capture state
  const toggleCapture = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      // Start capturing
      const permissionGranted = await requestPermission();
      if (permissionGranted) {
        setCountdown(intervalSeconds);
      }
    } else if (status === 'active') {
      // Pause capturing
      setStatus('paused');
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused') {
      // Resume capturing
      setStatus('active');
      setCountdown(intervalSeconds);
      toast.success("Capture d'écran reprise");
    }
  }, [status, requestPermission, intervalSeconds]);

  // Stop and clean up
  const stopCapture = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setStatus('idle');
  }, [mediaStream]);

  // Handle countdown and automatic capture
  useEffect(() => {
    let timerId: number;

    if (status === 'active') {
      timerId = window.setInterval(() => {
        setCountdown(prevCount => {
          if (prevCount <= 1) {
            // Capture screen when countdown reaches 0
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

  // Cleanup on unmount
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
