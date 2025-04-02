
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig } from './screenCapture/types';
import { defaultConfig } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { captureScreen } from './screenCapture/captureScreen';
import { useTimer } from './screenCapture/useTimer';
import { useCaptureState } from './screenCapture/useCaptureState';
import { useMediaStream } from './screenCapture/useMediaStream';
import { useDiagnostics } from './screenCapture/useDiagnostics';

// Set the default interval to 5 seconds (5000ms)
export const useScreenCapture = (intervalSeconds = 5, config = defaultConfig) => {
  const { logDebug } = createLogger();
  
  // Use the new state management hook
  const { 
    status, lastCaptureUrl, setLastCaptureUrl, lastError,
    captureCountRef, successCountRef, failureCountRef,
    configRef, permissionAttemptRef, permissionInProgressRef,
    isCapturingRef, incrementCaptureCount, incrementSuccessCount,
    incrementFailureCount, setActiveStatus, setPauseStatus,
    setIdleStatus, setErrorStatus, setRequestingStatus
  } = useCaptureState(config);
  
  // Use the timer hook for countdown logic
  const { countdown } = useTimer(intervalSeconds, status, async () => {
    if (status === 'active') {
      await handleCaptureScreen();
    }
  });
  
  // Use the media stream hook for handling permissions and stream
  const { mediaStreamRef, requestPermission, stopCapture, mountedRef } = useMediaStream(
    status,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    setActiveStatus,
    setErrorStatus,
    setRequestingStatus,
    intervalSeconds,
    () => {}
  );
  
  // Use diagnostics hook
  const { getDiagnostics } = useDiagnostics(
    status,
    countdown,
    mediaStreamRef,
    lastError,
    captureCountRef,
    successCountRef,
    failureCountRef,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef
  );
  
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
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, requestPermission, mountedRef]);
  
  // Toggle capture state
  const toggleCapture = useCallback(async () => {
    logDebug(`Toggle capture called, current status: ${status}`);
    
    if (status === 'idle' || status === 'error') {
      logDebug("Attempting to start capture from idle/error state");
      const permissionGranted = await requestPermission();
      if (permissionGranted && mountedRef.current) {
        logDebug("Permission granted, setting countdown");
        // Explicitly log the success here
        logDebug("Capture activated successfully");
      } else {
        logDebug("Permission denied or component unmounted");
      }
    } else if (status === 'active') {
      logDebug("Pausing capture");
      setPauseStatus();
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
      
      setActiveStatus();
      toast.success("Capture d'écran reprise");
    } else {
      logDebug(`No action for status: ${status}`);
    }
  }, [status, requestPermission, setPauseStatus, setActiveStatus, mountedRef]);

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
