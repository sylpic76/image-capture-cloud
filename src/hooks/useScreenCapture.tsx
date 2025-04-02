
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig, ScreenCaptureDiagnostics } from './screenCapture/types';
import { defaultConfig, lockConfiguration } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { requestMediaPermission, stopMediaTracks } from './screenCapture/mediaStream';
import { captureScreen } from './screenCapture/captureScreen';
import { setupNetworkMonitor } from './screenCapture/networkMonitor';

// Set the default interval to 5 seconds
export const useScreenCapture = (intervalSeconds = 5, config = defaultConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration(config));

  const { logDebug, logError } = createLogger();

  // Manage counters
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

  const requestPermission = useCallback(async () => {
    try {
      logDebug("Requesting screen capture permission...");
      setStatus('requesting-permission');
      
      const stream = await requestMediaPermission(configRef);
      
      if (!stream) {
        throw new Error("Failed to obtain media stream");
      }
      
      setMediaStream(stream);
      setStatus('active');
      toast.success("Capture d'écran activée avec mode restreint. L'application peut maintenant capturer votre écran.");
      return true;
    } catch (error) {
      logError("Permission request failed", error);
      setStatus('error');
      setLastError(error instanceof Error ? error : new Error(String(error)));
      toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      return false;
    }
  }, [logDebug, logError]);

  const handleCaptureScreen = useCallback(async () => {
    try {
      return await captureScreen(
        mediaStream,
        status,
        incrementCaptureCount,
        incrementSuccessCount,
        incrementFailureCount,
        setLastCaptureUrl
      );
    } catch (error) {
      setLastError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [mediaStream, status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount]);

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
  }, [status, requestPermission, intervalSeconds, logDebug]);

  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    stopMediaTracks(mediaStream);
    setMediaStream(null);
    setStatus('idle');
    logDebug("Capture stopped, status set to idle");
  }, [mediaStream, logDebug]);

  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}, config=${JSON.stringify(configRef.current)}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status, logDebug]);

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
            handleCaptureScreen();
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
  }, [status, handleCaptureScreen, intervalSeconds, logDebug]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      logDebug("Component unmounting, cleaning up media stream");
      stopMediaTracks(mediaStream);
    };
  }, [mediaStream, logDebug]);

  // Monitor browser console for unhandled fetch errors
  useEffect(() => {
    const cleanup = setupNetworkMonitor();
    return cleanup;
  }, []);

  // Get diagnostic information
  const getDiagnostics = useCallback((): ScreenCaptureDiagnostics => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStream,
      lastError: lastError?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      configuration: {...configRef.current},
      browserInfo: navigator.userAgent,
      isSdkDisabled: configRef.current.disableAdvancedSDK
    };
  }, [status, countdown, mediaStream, lastError]);

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
