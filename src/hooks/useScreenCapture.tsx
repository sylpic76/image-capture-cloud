
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

  // Fonction pour arrêter la capture
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

  // Fonction pour prendre une capture d'écran
  const takeScreenshot = useCallback(async () => {
    // Vérifier si une capture est déjà en cours pour éviter les appels simultanés
    if (captureInProgressRef.current) {
      logDebug("[useScreenCapture] Capture already in progress, skipping");
      return;
    }

    // Vérifier si le statut est actif et si le stream est disponible
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
      logError("[useScreenCapture] Error during capture", err);
    }
  }, [status, stopCapture, captureCount]);

  // Fonction pour initialiser la capture
  const initCapture = useCallback(async () => {
    if (status !== "idle") return;

    if (mountedRef.current) {
      setStatus("requesting-permission");
    }

    try {
      const stream = await requestMediaPermission(configRef);
      
      if (!mountedRef.current) {
        // Le composant a été démonté pendant la demande de permission
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

      // Arrêter tout timer existant
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Configurer un nouvel intervalle
      timerRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        
        setCountdown(prev => {
          if (prev <= 1) {
            // Ne pas appeler takeScreenshot directement dans le setCountdown
            // Planifier l'appel juste après
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
  }, [status, interval, takeScreenshot]);

  // Toggle la capture (start/stop)
  const toggleCapture = useCallback(() => {
    logDebug("[useScreenCapture] Toggle requested, current status:", status);
    if (status === "active") {
      stopCapture();
      toast.info("Capture arrêtée");
    } else {
      initCapture();
    }
  }, [status, initCapture, stopCapture]);

  // Effet pour démarrer automatiquement la capture si configuré
  useEffect(() => {
    // Marquer le composant comme monté
    mountedRef.current = true;
    
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      initCapture();
    }

    // Nettoyage lors du démontage du composant
    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [autoStart, status, suppressPermissionPrompt, initCapture, stopCapture]);

  // Obtenir les informations de diagnostic
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
