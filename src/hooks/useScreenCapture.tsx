
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { ImageProcessingStatus } from "@/types/assistant";
import { ScreenCaptureStatus, ScreenCaptureConfig } from "./screenCapture/types";
import { createLogger } from "./screenCapture/logger";
import { lockConfiguration } from "./screenCapture/config";
import { useMediaStream } from "./screenCapture/useMediaStream";
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

export const useScreenCapture = (defaultCountdown = 10, config?: CaptureConfig) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus] = useState<ImageProcessingStatus>("idle");

  const captureCountRef = useRef(0);
  const permissionAttemptRef = useRef(false);
  const permissionInProgressRef = useRef(false);

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

  // Status setter functions
  const setActiveStatus = useCallback(() => {
    setStatus("active");
    logDebug("Status set to: active");
  }, []);
  
  const setErrorStatus = useCallback((err: Error) => {
    setError(err);
    setStatus("error");
    logError("Status set to: error", err);
  }, []);
  
  const setRequestingStatus = useCallback(() => {
    setStatus("requesting-permission");
    logDebug("Status set to: requesting-permission");
  }, []);

  // Fonction de capture conditionnelle pour le timer
  const timerCallback = useCallback(() => {
    if (status === "active") {
      takeScreenshot();
    } else {
      logDebug("[useScreenCapture] Skipping capture - status is not active");
    }
  }, [status]);

  // Callback pour déclencher une capture
  const takeScreenshot = useCallback(async () => {
    logDebug("[useScreenCapture] 🔔 Trigger capture");
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[useScreenCapture] ❌ Cannot capture - not active or no stream");
      return;
    }

    try {
      const imageUrl = await captureScreen(
        mediaStreamRef.current,
        status,
        () => ++captureCountRef.current,
        () => {},
        () => {},
        () => {}
      );

      if (!imageUrl) {
        logDebug("[useScreenCapture] ❌ No image returned from capture");
      }

      if (imageUrl && autoUpload && !offline) {
        // Le `uploadScreenshot` est déjà appelé depuis captureScreen
        logDebug("[useScreenCapture] ✅ Screenshot captured and uploaded");
      }

      if (captureCountRef.current >= captureCount) {
        stopCapture();
        toast.info("Nombre maximum de captures atteint");
      }
    } catch (e) {
      logError("[useScreenCapture] Capture failed", e);
      toast.error("Erreur pendant la capture");
    }
  }, [status, autoUpload, offline, captureCount]);

  // Timer toutes les X secondes - using the conditional timer callback
  const { countdown, setCountdown } = useTimer(timerCallback);

  // Initialiser stream / permission
  const {
    mediaStreamRef,
    requestPermission,
    stopCapture: stopStreamTracks
  } = useMediaStream(
    status,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    setActiveStatus,
    setErrorStatus,
    setRequestingStatus,
    interval,
    setCountdown
  );

  const stopCapture = useCallback(() => {
    logDebug("[useScreenCapture] Stopping capture");
    stopStreamTracks();
    setStatus("idle");
  }, [stopStreamTracks]);

  const initCapture = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("requesting-permission");

    try {
      const success = await requestPermission();
      if (success) {
        setStatus("active");
        setCountdown(interval);
        logDebug("[useScreenCapture] 🎥 Stream initialisé");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
      setStatus("error");
    }
  }, [status, requestPermission, interval, setCountdown]);

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
