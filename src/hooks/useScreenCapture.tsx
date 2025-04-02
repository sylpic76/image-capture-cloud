
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig, ScreenCaptureDiagnostics } from './screenCapture/types';
import { defaultConfig, lockConfiguration } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { requestMediaPermission, stopMediaTracks } from './screenCapture/mediaStream';
import { captureScreen } from './screenCapture/captureScreen';

// Set the default interval to 5 seconds (5000ms)
export const useScreenCapture = (intervalSeconds = 5, config = defaultConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Use refs for stable references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration(config));
  const timerRef = useRef<number | undefined>(undefined);
  const isCapturingRef = useRef(false);
  const mountedRef = useRef(true); // Track component mounted state
  const permissionAttemptRef = useRef(false); // Track if we've attempted to request permission
  const permissionInProgressRef = useRef(false); // Track if permission request is in progress

  const { logDebug, logError } = createLogger();

  // Counter management
  const incrementCaptureCount = useCallback(() => {
    captureCountRef.current++;
    return captureCountRef.current;
  }, []);

  const incrementSuccessCount = useCallback(() => {
    successCountRef.current++;
  }, []);

  const incrementFailureCount = useCallback(() => {
    failureCountRef.current++;
  }, []);

  // Request permissions with improved event handling
  const requestPermission = useCallback(async () => {
    // Avoid multiple simultaneous permission requests
    if (permissionInProgressRef.current) {
      logDebug("Permission request already in progress, skipping");
      return false;
    }

    // If we already have an active stream, no need to request permission again
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      logDebug("Media stream already active, using existing stream");
      setStatus('active');
      setCountdown(intervalSeconds);
      return true;
    }

    try {
      logDebug("Requesting screen capture permission...");
      setStatus('requesting-permission');
      permissionAttemptRef.current = true;
      permissionInProgressRef.current = true;
      
      // Use the extracted media permission function
      const stream = await requestMediaPermission(configRef);
      
      // Reset the in-progress flag
      permissionInProgressRef.current = false;
      
      if (!stream) {
        throw new Error("Failed to obtain media stream");
      }
      
      // Add track ended event listeners
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          logDebug(`Track ${track.id} ended naturally by user or system`);
          if (mountedRef.current) {
            stopCapture();
          }
        });
      });
      
      // Store the stream in ref instead of state to avoid re-renders
      mediaStreamRef.current = stream;
      
      if (mountedRef.current) {
        setStatus('active');
        logDebug("Media stream obtained successfully, status set to active");
        
        // Start the countdown immediately for the first capture
        setCountdown(intervalSeconds);
      }
      
      return true;
    } catch (error) {
      // Reset the in-progress flag on error
      permissionInProgressRef.current = false;
      
      logError("Permission request failed", error);
      
      if (mountedRef.current) {
        setStatus('error');
        setLastError(error instanceof Error ? error : new Error(String(error)));
        toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      }
      
      return false;
    }
  }, [logDebug, logError, intervalSeconds]);

  // Properly stop the capture with cleanup
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    // Stop the countdown timer
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    
    // Stop all media tracks using the extracted function
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
    
    if (mountedRef.current) {
      setStatus('idle');
      logDebug("Capture stopped, status set to idle");
    }
  }, [logDebug]);

  // Toggle capture state
  const toggleCapture = useCallback(async () => {
    logDebug(`Toggle capture called, current status: ${status}`);
    
    if (status === 'idle' || status === 'error') {
      logDebug("Attempting to start capture from idle/error state");
      const permissionGranted = await requestPermission();
      if (permissionGranted && mountedRef.current) {
        logDebug("Permission granted, setting countdown");
        setCountdown(intervalSeconds);
        // Explicitly log the success here
        logDebug("Capture activated successfully");
      } else {
        logDebug("Permission denied or component unmounted");
      }
    } else if (status === 'active') {
      logDebug("Pausing capture");
      setStatus('paused');
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused') {
      logDebug("Resuming capture");
      
      // Check if we still have an active stream, request if needed
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        logDebug("Stream no longer active, requesting new permission");
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          logDebug("Failed to get new permission when resuming");
          return;
        }
      }
      
      setStatus('active');
      setCountdown(intervalSeconds);
      toast.success("Capture d'écran reprise");
    } else {
      logDebug(`No action for status: ${status}`);
    }
  }, [status, requestPermission, intervalSeconds, logDebug]);

  // Capture screen with the extracted captureScreen function
  const handleCaptureScreen = useCallback(async () => {
    if (isCapturingRef.current) {
      logDebug("Skipping capture because another capture is already in progress");
      return null;
    }

    // Validate that we have an active stream before attempting capture
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      logDebug("Cannot capture: mediaStream is null or inactive");
      
      // If status is 'active' but stream is invalid, try to recover
      if (status === 'active') {
        logDebug("Status is active but stream is invalid, attempting to recover");
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          logDebug("Failed to recover stream");
          return null;
        }
      } else {
        return null;
      }
    }

    try {
      isCapturingRef.current = true;
      logDebug("🖼️ Capture en cours...");
      
      // Use the extracted capture function
      const url = await captureScreen(
        mediaStreamRef.current,
        status,
        incrementCaptureCount,
        incrementSuccessCount,
        incrementFailureCount,
        (url: string) => {
          if (mountedRef.current) {
            setLastCaptureUrl(url);
          }
        }
      );
      
      return url;
    } finally {
      isCapturingRef.current = false;
    }
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, requestPermission]);

  // Fonction récursive pour effectuer la capture selon un intervalle
  const recursiveCapture = useCallback(async () => {
    if (!mountedRef.current || status !== 'active') return;
    
    // Décrémenter le compteur
    setCountdown(prevCount => {
      const newCount = prevCount <= 1 ? intervalSeconds : prevCount - 1;
      logDebug(`Countdown: ${prevCount} -> ${newCount}`);
      return newCount;
    });
    
    // Quand le compte à rebours atteint 1, capturer l'écran
    if (countdown <= 1) {
      logDebug("Countdown reached threshold, capturing screen");
      try {
        await handleCaptureScreen();
      } catch (err) {
        if (mountedRef.current) {
          logError("Error during capture in timer", err);
        }
      }
      
      // Réinitialiser le compte à rebours après la capture
      if (mountedRef.current) {
        setCountdown(intervalSeconds);
      }
    }
    
    // Programmer la prochaine itération si toujours actif
    if (mountedRef.current && status === 'active') {
      timerRef.current = window.setTimeout(recursiveCapture, 1000);
    }
  }, [status, countdown, intervalSeconds, handleCaptureScreen, logDebug, logError]);

  // Gérer le compte à rebours timer avec useEffect - utiliser setTimeout pour un meilleur contrôle
  useEffect(() => {
    if (status === 'active') {
      logDebug(`Starting countdown timer with interval: ${intervalSeconds}s`);
      
      // Démarrer la capture récursive
      if (timerRef.current === undefined) {
        recursiveCapture();
      }
      
      // Fonction de nettoyage
      return () => {
        if (timerRef.current !== undefined) {
          window.clearTimeout(timerRef.current);
          timerRef.current = undefined;
        }
      };
    }
  }, [status, intervalSeconds, recursiveCapture, logDebug]);

  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}, config=${JSON.stringify(configRef.current)}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status, logDebug]);

  // Critical: Component unmount cleanup
  useEffect(() => {
    // Mark the component as mounted
    mountedRef.current = true;
    
    return () => {
      logDebug("Component unmounting, cleaning up media stream");
      mountedRef.current = false;
      stopCapture();
    };
  }, [stopCapture, logDebug]);

  // Get diagnostic information
  const getDiagnostics = useCallback((): ScreenCaptureDiagnostics => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStreamRef.current,
      lastError: lastError?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      configuration: {...configRef.current},
      browserInfo: navigator.userAgent,
      isSdkDisabled: configRef.current.disableAdvancedSDK,
      permissionAttempted: permissionAttemptRef.current,
      permissionInProgress: permissionInProgressRef.current
    };
  }, [status, countdown, lastError]);

  return {
    status,
    countdown,
    toggleCapture,
    stopCapture,
    captureScreen: handleCaptureScreen,
    lastCaptureUrl,
    getDiagnostics,
    sdkDisabled: configRef.current.disableAdvancedSDK
  };
};
