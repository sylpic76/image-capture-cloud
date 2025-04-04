import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
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

export const useScreenCapture = (intervalSeconds = 10, config?: CaptureConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    autoStart = false,
    interval = intervalSeconds,
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
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
    setStatus("idle");
  }, []);

  const takeScreenshot = useCallback(async () => {
    const stream = mediaStreamRef.current;
    if (status !== "active" || !stream || !stream.active) {
      logDebug("[useScreenCapture] ❌ Cannot take screenshot — status:", status, "| stream:", !!stream, "| stream.active:", stream?.active);
      return;
    }

    logDebug("[useScreenCapture] ✅ Triggering capture...");

    try {
      await captureScreen(
        stream,
        status,
        () => ++captureCountRef.current,
        () => {},
        () => {},
        () => {}
      );

      if (captureCountRef.current >= captureCount) {
        logDebug("[useScreenCapture] Max captures reached. Stopping...");
        stopCapture();
      }
    } catch (error) {
      logError("[useScreenCapture] Capture failed", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
      toast.error("Erreur lors de la capture");
      stopCapture();
    }
  }, [status, captureCount, stopCapture]);

  const initCapture = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("requesting-permission");

    try {
      const stream = await requestMediaPermission(configRef.current);
      if (!stream || !stream.active) throw new Error("Permission refusée ou stream inactif");

      mediaStreamRef.current = stream;
      logDebug("[useScreenCapture] 🎥 Stream initialisé");

      setStatus("active");
      setCountdown(interval);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            logDebug("[useScreenCapture] Countdown terminé → capture");
            takeScreenshot();
            return interval;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      logError("[useScreenCapture] Init error", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
      setStatus("error");
    }
  }, [status, interval, takeScreenshot]);

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
