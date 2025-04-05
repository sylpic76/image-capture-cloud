
import { useEffect, useCallback } from "react";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { lockConfiguration } from "./screenCapture/config";
import { captureScreen } from "./screenCapture/captureScreen";
import { useCaptureState } from "./screenCapture/useCaptureState";
import { useMediaStream } from "./screenCapture/useMediaStream";
import { useTimer } from "./screenCapture/useTimer";
import { useDiagnostics } from "./screenCapture/useDiagnostics";

const { logDebug, logError } = createLogger();

export interface CaptureConfig {
  autoStart?: boolean;
  interval?: number;
  captureCount?: number;
  autoUpload?: boolean;
  offline?: boolean;
  suppressPermissionPrompt?: boolean;
}

export const useScreenCapture = (countdownSeconds = 10, config?: CaptureConfig) => {
  // Extract configuration options with defaults
  const {
    autoStart = true,
    interval = 10,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false
  } = config || {};

  // Use the capture state hook to manage status and counters
  const {
    status,
    lastCaptureUrl,
    setLastCaptureUrl,
    lastError,
    captureCountRef,
    successCountRef,
    failureCountRef,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    isCapturingRef,
    incrementCaptureCount,
    incrementSuccessCount,
    incrementFailureCount,
    setActiveStatus,
    setPauseStatus,
    setIdleStatus,
    setErrorStatus,
    setRequestingStatus,
  } = useCaptureState(lockConfiguration({
    useLowResolution: true,
    captureWithAudio: false,
    requestFrameRate: 60,
    disableAdvancedSDK: suppressPermissionPrompt
  }));

  // Function to take a screenshot - define this first as it's used by useTimer
  const takeScreenshot = useCallback(async () => {
    // Check if a capture is already in progress to avoid simultaneous calls
    if (isCapturingRef.current) {
      logDebug("[useScreenCapture] Capture already in progress, skipping");
      return;
    }

    // Check if the status is active and if the stream is available
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[useScreenCapture] Cannot take screenshot - system not running or no stream");
      return;
    }

    try {
      isCapturingRef.current = true;
      logDebug("[useScreenCapture] Triggering screenshot capture...");

      const url = await captureScreen(
        mediaStreamRef.current,
        status,
        incrementCaptureCount,
        incrementSuccessCount,
        incrementFailureCount,
        setLastCaptureUrl
      );

      isCapturingRef.current = false;

      if (!url) {
        logError("[useScreenCapture] No URL returned from captureScreen");
        return;
      }

      logDebug(`[useScreenCapture] ✅ Screenshot captured and uploaded to: ${url}`);

      if (captureCountRef.current >= captureCount) {
        stopCapture();
      }
    } catch (err) {
      isCapturingRef.current = false;
      logError("[useScreenCapture] Error during capture: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, [status, captureCount, incrementCaptureCount, incrementSuccessCount, incrementFailureCount, setLastCaptureUrl]);

  // Define useTimer first so we have setCountdown available for useMediaStream
  const { countdown, setCountdown } = useTimer(
    interval,
    status,
    takeScreenshot
  );

  // Now use the media stream hook with setCountdown available
  const { mediaStreamRef, requestPermission, stopCapture, mountedRef } = useMediaStream(
    status,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    setActiveStatus,
    setErrorStatus,
    setRequestingStatus,
    interval, // Use the interval from the config
    setCountdown
  );

  // Use the diagnostics hook to provide diagnostic information
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

  // Toggle capture (start/stop)
  const toggleCapture = useCallback(() => {
    logDebug("[useScreenCapture] Toggle requested, current status:", status);
    if (status === "active") {
      stopCapture();
    } else {
      initCapture();
    }
  }, [status, stopCapture]);

  // Function to initialize the capture
  const initCapture = useCallback(async () => {
    if (status !== "idle") return;
    await requestPermission();
  }, [status, requestPermission]);

  // Effect to automatically start the capture if configured
  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      initCapture();
    }
    
    // Cleanup handled by the useMediaStream hook
  }, [autoStart, status, suppressPermissionPrompt, initCapture]);

  const sdkDisabled = configRef.current.disableAdvancedSDK;

  return {
    status,
    countdown,
    error: lastError,
    takeScreenshot,
    initCapture,
    stopCapture,
    toggleCapture,
    isActive: status === "active",
    sdkDisabled,
    getDiagnostics,
  };
};
