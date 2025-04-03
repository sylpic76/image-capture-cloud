import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { ScreenCaptureStatus, ScreenCaptureConfig } from './screenCapture/types';
import { defaultConfig } from './screenCapture/config';
import { createLogger } from './screenCapture/logger';
import { captureScreen } from './screenCapture/captureScreen';
import { useTimer } from './screenCapture/useTimer';
import { useCaptureState } from './screenCapture/useCaptureState';
import { useMediaStream } from './screenCapture/useMediaStream';
import { useDiagnostics } from './screenCapture/useDiagnostics';
import { setupNetworkMonitor } from './screenCapture/network';

// Set the default interval to 10 seconds (10000ms)
export const useScreenCapture = (intervalSeconds = 10, config = defaultConfig) => {
  const { logDebug } = createLogger();
  const isMountedRef = useRef(true);
  
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
  const { countdown, setCountdown } = useTimer(intervalSeconds, status, async () => {
    if (status === 'active' && isMountedRef.current) {
      await handleCaptureScreen();
    }
  });
  
  // Clean up on unmount
  useEffect(() => {
    logDebug("Setting up useScreenCapture with cleanup");
    return () => {
      logDebug("Unmounting useScreenCapture, cleaning up");
      isMountedRef.current = false;
    };
  }, []);
  
  // Set up network monitoring
  useEffect(() => {
    const cleanupMonitor = setupNetworkMonitor();
    return () => cleanupMonitor();
  }, []);
  
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
    setCountdown
  );
  
  // Use diagnostics hook
  const { getDiagnostics } = useDiagnostics(
    status as ScreenCaptureStatus,
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
    if (!isMountedRef.current) {
      logDebug("Component unmounted, skipping capture");
      return null;
    }
    
    if (isCapturingRef.current) {
      logDebug("Skipping capture because another capture is already in progress");
      return null;
    }

    // Validate that we have an active stream before attempting capture
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      logDebug("Cannot capture: mediaStream is null or inactive");
      
      // If status is 'active' but stream is invalid, try to recover
      if (status === 'active' && isMountedRef.current) {
        logDebug("Status is active but stream is invalid, attempting to recover");
        const permissionGranted = await requestPermission();
        if (!permissionGranted || !isMountedRef.current) {
          logDebug("Failed to recover stream or component unmounted");
          return null;
        }
      } else {
        return null;
      }
    }

    try {
      isCapturingRef.current = true;
      logDebug("🖼️ Capture en cours...");
      
      if (!isMountedRef.current) {
        logDebug("Component unmounted before capture, aborting");
        isCapturingRef.current = false;
        return null;
      }
      
      // Use the extracted capture function
      const url = await captureScreen(
        mediaStreamRef.current,
        status,
        incrementCaptureCount,
        incrementSuccessCount,
        incrementFailureCount,
        (url: string) => {
          if (isMountedRef.current && mountedRef.current) {
            setLastCaptureUrl(url);
          }
        }
      );
      
      return url;
    } catch (error) {
      logDebug("Capture failed but we're handling it gracefully");
      // Don't change status to error just because of capture failures
      // Only log the error but don't interrupt the capture loop
      return null;
    } finally {
      isCapturingRef.current = false;
    }
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, requestPermission, mountedRef]);
  
  // Toggle capture state
  const toggleCapture = useCallback(async () => {
    if (!isMountedRef.current) {
      logDebug("Toggle capture called after component unmounted");
      return;
    }
    
    logDebug(`Toggle capture called, current status: ${status}`);
    
    if (status === 'idle' || status === 'error') {
      logDebug("Attempting to start capture from idle/error state");
      const permissionGranted = await requestPermission();
      if (permissionGranted && isMountedRef.current && mountedRef.current) {
        logDebug("Permission granted, setting countdown");
        // Explicitly log the success here
        logDebug("Capture activated successfully");
        // Make sure countdown is initialized properly
        setCountdown(intervalSeconds);
        toast.success("Capture d'écran activée");
      } else {
        logDebug("Permission denied or component unmounted");
      }
    } else if (status === 'active' && isMountedRef.current) {
      logDebug("Pausing capture");
      setPauseStatus();
      toast.success("Capture d'écran mise en pause");
    } else if (status === 'paused' && isMountedRef.current) {
      logDebug("Resuming capture");
      
      // Check if we still have an active stream, request if needed
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        logDebug("Stream no longer active, requesting new permission");
        const permissionGranted = await requestPermission();
        if (!permissionGranted || !isMountedRef.current) {
          logDebug("Failed to get new permission when resuming or component unmounted");
          return;
        }
      }
      
      setActiveStatus();
      setCountdown(intervalSeconds); // Reset countdown when resuming
      toast.success("Capture d'écran reprise");
    } else {
      logDebug(`No action for status: ${status}`);
    }
  }, [status, requestPermission, setPauseStatus, setActiveStatus, mountedRef, intervalSeconds, setCountdown]);

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
