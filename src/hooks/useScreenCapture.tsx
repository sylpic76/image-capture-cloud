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

  const {
    status, lastCaptureUrl, setLastCaptureUrl, lastError,
    captureCountRef, successCountRef, failureCountRef,
    configRef, permissionAttemptRef, permissionInProgressRef,
    isCapturingRef, incrementCaptureCount, incrementSuccessCount,
    incrementFailureCount, setActiveStatus, setPauseStatus,
    setIdleStatus, setErrorStatus, setRequestingStatus
  } = useCaptureState(config);

  const { countdown, setCountdown } = useTimer(intervalSeconds, status, async () => {
    if (status === 'active' && isMountedRef.current) {
      await handleCaptureScreen();
    }
  });

  useEffect(() => {
    logDebug("Setting up useScreenCapture with cleanup");
    return () => {
      logDebug("Unmounting useScreenCapture, cleaning up");
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const cleanupMonitor = setupNetworkMonitor();
    return () => cleanupMonitor();
  }, []);

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

  const handleCaptureScreen = useCallback(async () => {
    if (!isMountedRef.current) {
      logDebug("Component unmounted, skipping capture");
      return null;
    }

    if (isCapturingRef.current) {
      logDebug("Skipping capture because another capture is already in progress");
      return null;
    }

    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      logDebug("Cannot capture: mediaStream is null or inactive");

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
      logDebug("\uD83D\uDDBC\uFE0F Capture en cours...");

      if (!isMountedRef.current) {
        logDebug("Component unmounted before capture, aborting");
        isCapturingRef.current = false;
        return null;
      }

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
      return null;
    } finally {
      isCapturingRef.current = false;
    }
  }, [status, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, requestPermission, mountedRef]);

  const toggleCapture = useCallback(async () => {
    if (!isMountedRef.current) {
      logDebug("Toggle capture called after component unmounted");
      return;
    }

    logDebug(`Toggle capture called, current status: ${status}`);

    if (status === 'idle' || status === 'error') {
      logDebug("Attempting to start capture from idle/error state");

      try {
        const permissionGranted = await requestPermission();

        if (permissionGranted && isMountedRef.current && mountedRef.current) {
          logDebug("Permission granted, setting countdown");
          setCountdown(intervalSeconds);
          toast.success("Capture d'\u00e9cran activ\u00e9e");
        } else {
          logDebug("Permission denied or component unmounted");
          if (isMountedRef.current) {
            toast.error("La permission de capture d'\u00e9cran a \u00e9t\u00e9 refus\u00e9e");
          }
        }
      } catch (error) {
        logDebug("Error requesting permission", error);
        if (isMountedRef.current) {
          toast.error("Erreur lors de la demande de permission");
          setErrorStatus(new Error("Permission request failed"));
        }
      }
    } else if (status === 'active' && isMountedRef.current) {
      logDebug("Pausing capture");
      setPauseStatus();
      toast.success("Capture d'\u00e9cran mise en pause");
    } else if (status === 'paused' && isMountedRef.current) {
      logDebug("Resuming capture");

      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        logDebug("Stream no longer active, requesting new permission");
        try {
          const permissionGranted = await requestPermission();
          if (!permissionGranted || !isMountedRef.current) {
            logDebug("Failed to get new permission when resuming or component unmounted");
            if (isMountedRef.current) {
              toast.error("La permission de capture d'\u00e9cran a \u00e9t\u00e9 refus\u00e9e");
            }
            return;
          }
        } catch (error) {
          logDebug("Error requesting permission for resume", error);
          if (isMountedRef.current) {
            toast.error("Erreur lors de la demande de permission pour reprendre");
          }
          return;
        }
      }

      setActiveStatus();
      setCountdown(intervalSeconds);
      toast.success("Capture d'\u00e9cran reprise");
    } else {
      logDebug(`No action for status: ${status}`);
    }
  }, [status, requestPermission, setPauseStatus, setActiveStatus, mountedRef, intervalSeconds, setCountdown, setErrorStatus]);

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

