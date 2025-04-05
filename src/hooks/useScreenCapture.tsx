
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus, ScreenCaptureConfig } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { requestMediaPermission, stopMediaTracks } from "./screenCapture/mediaStream";
import { lockConfiguration } from "./screenCapture/config";
import { useTimer } from "./screenCapture/useTimer";

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
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const captureInProgressRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  const lastCaptureUrlRef = useRef<string | null>(null);

  const {
    autoStart = true,
    interval = 10,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false
  } = config || {};

  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration({
    useLowResolution: true,
    captureWithAudio: false,
    requestFrameRate: 60,
    disableAdvancedSDK: suppressPermissionPrompt
  }));

  // Function to stop the capture
  const stopCapture = useCallback(() => {
    logDebug("[useScreenCapture] Stopping capture");
    
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
    
    if (mountedRef.current) {
      setStatus("idle");
    }
  }, []);

  // Function to take a screenshot
  const takeScreenshot = useCallback(async () => {
    // Check if a capture is already in progress to avoid simultaneous calls
    if (captureInProgressRef.current) {
      logDebug("[useScreenCapture] Capture already in progress, skipping");
      return;
    }

    // Check if the status is active and if the stream is available
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[useScreenCapture] Cannot take screenshot - system not running or no stream");
      return;
    }

    try {
      captureInProgressRef.current = true;
      logDebug("[useScreenCapture] Triggering screenshot capture...");

      const incrementSuccessCount = () => {
        successCountRef.current += 1;
        return successCountRef.current;
      };

      const incrementFailureCount = () => {
        failureCountRef.current += 1;
        return failureCountRef.current;
      };

      const setLastCaptureUrl = (url: string) => {
        lastCaptureUrlRef.current = url;
      };

      const url = await captureScreen(
        mediaStreamRef.current,
        status,
        () => ++captureCountRef.current,
        incrementSuccessCount,
        incrementFailureCount,
        setLastCaptureUrl
      );

      captureInProgressRef.current = false;

      if (!url) {
        logError("[useScreenCapture] No URL returned from captureScreen");
        return;
      }

      logDebug(`[useScreenCapture] ✅ Screenshot captured and uploaded to: ${url}`);

      if (captureCountRef.current >= captureCount) {
        stopCapture();
      }
    } catch (err) {
      captureInProgressRef.current = false;
      logError("[useScreenCapture] Error during capture: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, [status, stopCapture, captureCount]);

  // Utiliser le hook useTimer pour gérer le compte à rebours et la capture
  const { countdown, setCountdown } = useTimer(
    interval,
    status,
    takeScreenshot
  );

  // Function to initialize the capture
  const initCapture = useCallback(async () => {
    if (status !== "idle") return;

    if (mountedRef.current) {
      setStatus("requesting-permission");
    }

    try {
      const stream = await requestMediaPermission(configRef);
      
      if (!mountedRef.current) {
        // The component has been unmounted during the permission request
        stopMediaTracks(stream);
        return;
      }
      
      if (!stream) {
        if (mountedRef.current) {
          setStatus("error");
          setError(new Error("Failed to obtain media stream"));
        }
        return;
      }

      mediaStreamRef.current = stream;
      logDebug("[useScreenCapture] 🎥 Stream initialized successfully");

      if (mountedRef.current) {
        setStatus("active");
        setCountdown(interval);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      logError("[useScreenCapture] Error while initializing capture: " + (err instanceof Error ? err.message : "Unknown error"));
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStatus("error");
    }
  }, [status, interval, setCountdown]);

  // Toggle capture (start/stop)
  const toggleCapture = useCallback(() => {
    logDebug("[useScreenCapture] Toggle requested, current status:", status);
    if (status === "active") {
      stopCapture();
      toast.info("Capture arrêtée");
    } else {
      initCapture();
    }
  }, [status, initCapture, stopCapture]);

  // Effect to automatically start the capture if configured
  useEffect(() => {
    // Mark component as mounted
    mountedRef.current = true;
    
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      initCapture();
    }

    // Cleanup when the component is unmounted
    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [autoStart, status, suppressPermissionPrompt, initCapture, stopCapture]);

  // Get diagnostic information
  const getDiagnostics = useCallback(() => ({
    status,
    countdown,
    hasMediaStream: !!mediaStreamRef.current,
    lastError: error?.message || null,
    captures: captureCountRef.current,
    successful: successCountRef.current,
    failed: failureCountRef.current,
    interval
  }), [status, countdown, error, interval]);

  return {
    status,
    countdown,
    error,
    takeScreenshot,
    initCapture,
    stopCapture,
    toggleCapture,
    isActive: status === "active",
    sdkDisabled,
    getDiagnostics,
  };
};
