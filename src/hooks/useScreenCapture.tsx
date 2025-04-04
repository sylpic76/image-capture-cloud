import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { uploadScreenshot } from "./screenCapture/utils/uploadUtils";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus, ScreenCaptureConfig } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { requestMediaPermission, stopMediaTracks } from "./screenCapture/mediaStream";
import { lockConfiguration } from "./screenCapture/config";

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
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const captureCountRef = useRef(0);

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

  const stopCapture = useCallback(() => {
    logDebug("[useScreenCapture] Stopping capture");
    if (timerRef.current) clearInterval(timerRef.current);
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
    setStatus("idle");
  }, []);

  const takeScreenshot = useCallback(async () => {
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[useScreenCapture] Cannot take screenshot - system not running or no stream");
      return;
    }

    const imageUrl = await captureScreen(
      mediaStreamRef.current,
      status,
      () => ++captureCountRef.current,
      () => {},
      () => {},
      () => {}
    );

    if (imageUrl && autoUpload && !offline) {
      try {
        await uploadScreenshot(imageUrl);
      } catch (err) {
        logError("[Capture] Upload failed:", err);
      }
    }

    if (captureCountRef.current >= captureCount) {
      stopCapture();
    }
  }, [status, autoUpload, offline, captureCount, stopCapture]);

  const initCapture = useCallback(async () => {
    if (status !== "idle") return;

    setStatus("requesting-permission");

    try {
      const stream = await requestMediaPermission(configRef);
      if (stream) {
        mediaStreamRef.current = stream;
        logDebug("[useScreenCapture] 🎥 Stream initialisé");
        setStatus("active");
        setCountdown(interval);

        timerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              logDebug("[useScreenCapture] Countdown reached threshold, triggering capture callback");
              takeScreenshot();
              return interval;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
      setStatus("error");
    }
  }, [status, configRef, interval, takeScreenshot]);

  const toggleCapture = useCallback(() => {
    logDebug("[useScreenCapture] Toggle requested, current status:", status);
    if (status === "active") {
      stopCapture();
      toast.info("Capture arrêtée");
    } else {
      initCapture();
    }
  }, [status, initCapture, stopCapture]);

  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      initCapture();
    }

    return () => stopCapture();
  }, [autoStart, status, suppressPermissionPrompt, initCapture, stopCapture]);

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
