
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
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const captureInProgressRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

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
    disableAdvancedSDK: suppressPermissionPrompt
  }));

  // Function to stop the capture
  const stopCapture = useCallback(() => {
    logDebug("[useScreenCapture] Stopping capture");
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
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

      const url = await captureScreen(
        mediaStreamRef.current,
        status,
        () => ++captureCountRef.current,
        () => {},
        () => {},
        () => {}
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
      logError("[useScreenCapture] Error during capture", err instanceof Error ? err : new Error("Unknown error"));
    }
  }, [status, stopCapture, captureCount]);

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
        }
        return;
      }

      mediaStreamRef.current = stream;
      logDebug("[useScreenCapture] 🎥 Stream initialized successfully");

      if (mountedRef.current) {
        setStatus("active");
        setCountdown(interval);
      }

      // Stop any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Configure a new interval
      timerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        
        setCountdown(prev => {
          if (prev <= 1) {
            // Don't call takeScreenshot directly in setCountdown
            // Schedule the call just after
            setTimeout(() => {
              if (mountedRef.current && status === "active") {
                takeScreenshot();
              }
            }, 0);
            return interval;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      if (!mountedRef.current) return;
      
      logError("[useScreenCapture] Error while initializing capture", err instanceof Error ? err : new Error("Unknown error"));
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStatus("error");
    }
  }, [status, interval, takeScreenshot, stopCapture]);

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
