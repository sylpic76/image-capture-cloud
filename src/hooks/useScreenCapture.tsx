import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { uploadScreenshot } from "./screenCapture/utils/uploadUtils";
import { fetchLatestScreenshot } from "@/utils/screenshotUtils";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus, ScreenCaptureConfig } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { requestMediaPermission, stopMediaTracks } from "./screenCapture/mediaStream";
import { lockConfiguration } from "./screenCapture/config";

const { logDebug, logError } = createLogger();

export interface CaptureConfig {
  autoStart?: boolean;
  interval?: number; // en secondes
  captureCount?: number;
  autoUpload?: boolean;
  offline?: boolean;
  suppressPermissionPrompt?: boolean;
}

export const useScreenCapture = (countdownSeconds = 1, config?: CaptureConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  const mountedRef = useRef(true);
  const permissionAttemptRef = useRef(false);
  const permissionInProgressRef = useRef(false);
  const intervalSeconds = config?.interval || 1;

  const {
    autoStart = false,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false,
  } = config || {};

  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration({
    useLowResolution: true,
    captureWithAudio: false,
    disableAdvancedSDK: suppressPermissionPrompt
  }));

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(intervalSeconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, [intervalSeconds]);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (status === "idle") return;
    logDebug("[Capture] stopCapture() CALLED");

    stopCountdown();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    setStatus("idle");
  }, [status, stopCountdown]);

  const takeScreenshot = useCallback(async () => {
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[Capture] Cannot take screenshot - inactive or no stream");
      return;
    }

    try {
      const captureId = ++captureCountRef.current;
      logDebug(`[Capture] Screenshot #${captureId}`);

      const imageUrl = await captureScreen(
        mediaStreamRef.current,
        status,
        () => captureCountRef.current,
        () => successCountRef.current++,
        () => failureCountRef.current++,
        () => {}
      );

      if (autoUpload && !offline && imageUrl) {
        try {
          await fetchLatestScreenshot(setImageProcessingStatus);
        } catch (err) {
          logError("[Capture] Error fetching latest screenshot:", err);
        }
      }

      if (captureCountRef.current >= captureCount) {
        logDebug("[Capture] Max capture count reached");
        stopCapture();
      }

    } catch (error) {
      logError("[Capture] Screenshot error:", error);
      handleCaptureError(error);
    }
  }, [status, autoUpload, offline, stopCapture, captureCount]);

  const handleCaptureError = useCallback((error: any) => {
    stopCapture();
    setStatus("error");
    setError(error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Permission")) {
      toast.error("Permission refusée", {
        description: "Autorise le partage d'écran pour utiliser cette fonctionnalité.",
      });
    } else {
      toast.error("Erreur de capture", {
        description: errorMessage.substring(0, 100),
      });
    }
  }, [stopCapture]);

  const initCapture = useCallback(async () => {
    if (status === "active" || status === "requesting-permission") return;

    if (suppressPermissionPrompt) {
      setSdkDisabled(true);
      return;
    }

    setError(null);
    setStatus("requesting-permission");

    const permissionGranted = await requestMediaPermission(mediaStreamRef);
    if (permissionGranted) {
      setStatus("active");
      startCountdown();
    } else {
      setStatus("error");
    }
  }, [status, suppressPermissionPrompt, startCountdown]);

  useEffect(() => {
    if (countdown === 0 && status === "active") {
      takeScreenshot();
      setCountdown(intervalSeconds);
    }
  }, [countdown, status, takeScreenshot, intervalSeconds]);

  const toggleCapture = useCallback(() => {
    if (status === "idle" || status === "error") {
      initCapture();
    } else {
      stopCapture();
      toast.info("Capture arrêtée");
    }
  }, [status, initCapture, stopCapture]);

  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      initCapture();
    }

    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [autoStart, status, suppressPermissionPrompt, initCapture, stopCapture]);

  const getDiagnostics = useCallback(() => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStreamRef.current,
      lastError: error?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      intervalSeconds,
    };
  }, [status, countdown, error, intervalSeconds]);

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

