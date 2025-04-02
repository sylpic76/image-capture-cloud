
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig, ScreenCaptureDiagnostics } from './screenCapture/types';
import { defaultConfig, lockConfiguration } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { requestMediaPermission, stopMediaTracks } from './screenCapture/mediaStream';
import { validateCapturePrerequisites } from './screenCapture/utils/mediaValidation';
import { setupNetworkMonitor } from './screenCapture/networkMonitor';
import { captureScreen } from './screenCapture/captureScreen';

// Set the default interval to 5 seconds
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
    try {
      logDebug("Requesting screen capture permission...");
      setStatus('requesting-permission');
      
      // Use the extracted media permission function
      const stream = await requestMediaPermission(configRef);
      
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
        // Removed toast notification here
      }
      
      return true;
    } catch (error) {
      logError("Permission request failed", error);
      
      if (mountedRef.current) {
        setStatus('error');
        setLastError(error instanceof Error ? error : new Error(String(error)));
        toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      }
      
      return false;
    }
  }, [logDebug, logError]);

  // Properly stop the capture with cleanup
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    // Stop the countdown timer
    if (timerRef.current !== undefined) {
      window.clearInterval(timerRef.current);
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
      const permissionGranted = await requestPermission();
      if (permissionGranted && mountedRef.current) {
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
  }, [status, requestPermission, intervalSeconds, logDebug]);

  // Capture screen with the extracted captureScreen function
  const handleCaptureScreen = useCallback(async () => {
    if (isCapturingRef.current) {
      logDebug("Skipping capture because another capture is already in progress");
      return null;
    }

    try {
      isCapturingRef.current = true;
      
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
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, logDebug]);

  // Manage countdown timer with useEffect
  useEffect(() => {
    if (status === 'active') {
      logDebug(`Starting countdown timer with interval: ${intervalSeconds}s`);
      
      timerRef.current = window.setInterval(() => {
        if (!mountedRef.current) return;
        
        setCountdown(prevCount => {
          const newCount = prevCount <= 1 ? intervalSeconds : prevCount - 1;
          logDebug(`Countdown: ${prevCount} -> ${newCount}`);
          
          if (prevCount <= 1) {
            logDebug("Countdown reached zero, capturing screen");
            handleCaptureScreen().catch(err => {
              if (mountedRef.current) {
                logError("Error during capture in timer", err);
              }
            });
          }
          
          return newCount;
        });
      }, 1000);
    } else if (timerRef.current !== undefined) {
      logDebug("Clearing countdown timer");
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }

    return () => {
      if (timerRef.current !== undefined) {
        logDebug("Cleanup: clearing countdown timer");
        window.clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [status, handleCaptureScreen, intervalSeconds, logDebug, logError]);

  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}, config=${JSON.stringify(configRef.current)}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status, logDebug]);

  // Monitor browser console for unhandled fetch errors
  useEffect(() => {
    const cleanup = setupNetworkMonitor();
    return cleanup;
  }, []);

  // Critical: Component unmount cleanup
  useEffect(() => {
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
      isSdkDisabled: configRef.current.disableAdvancedSDK
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
