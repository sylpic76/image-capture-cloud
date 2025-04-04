
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

/**
 * Hook to capture screenshots from display
 */
export const useScreenCapture = (countdownSeconds = 3, config?: CaptureConfig) => {
  // State and refs
  const [status, setStatus] = useState<ScreenCaptureStatus>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  
  // References to maintain state between renders
  const captureCountRef = useRef<number>(0);
  const successCountRef = useRef<number>(0);
  const failureCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const permissionAttemptRef = useRef<boolean>(false);
  const permissionInProgressRef = useRef<boolean>(false);
  
  // Configuration defaults
  const {
    autoStart = false,
    interval = 30, // 30 secondes par défaut en secondes
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false,
  } = config || {};

  // Utiliser directement l'intervalle en secondes pour l'affichage du compte à rebours
  const intervalSeconds = interval;
  
  // Initialize the capture config
  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration({
    useLowResolution: true,
    captureWithAudio: false,
    disableAdvancedSDK: suppressPermissionPrompt
  }));
  
  // Use the mediaStream hook for better encapsulation
  const { mediaStreamRef, requestPermission, stopCapture } = useMediaStream(
    status,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    () => {
      setStatus("active");
      setError(null);
      // S'assurer que le compte à rebours est initialisé correctement
      setCountdown(intervalSeconds);
    },
    (err) => {
      setStatus("error");
      setError(err);
    },
    () => {
      setStatus("requesting-permission");
      setCountdown(intervalSeconds);
    },
    intervalSeconds,
    setCountdown
  );
  
  /**
   * Take a screenshot
   */
  const takeScreenshot = useCallback(async () => {
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[Capture] Cannot take screenshot - system not running or no stream");
      return null;
    }
    
    logDebug("[Capture] Capturing screenshot...");
    
    try {
      const currentStream = mediaStreamRef.current;
      
      // Increment the capture counter
      const captureId = captureCountRef.current + 1;
      captureCountRef.current = captureId;
      
      logDebug(`[Capture] Taking screenshot #${captureId}`);
      
      // Capture the screen
      const imageUrl = await captureScreen(
        currentStream,
        status,
        () => captureCountRef.current,
        () => { successCountRef.current += 1; },
        () => { failureCountRef.current += 1; },
        (url) => {
          logDebug(`[Capture] Setting last capture URL: ${url.substring(0, 50)}...`);
        }
      );
      
      // if image upload is enabled and we're not in offline mode
      if (autoUpload && !offline && imageUrl) {
        logDebug("[Capture] Auto-uploading captured image");
        
        // Fetch back the latest screenshot
        try {
          await fetchLatestScreenshot(setImageProcessingStatus);
        } catch (err) {
          logError("[Capture] Error fetching latest screenshot:", err);
        }
      }
      
      // Réinitialiser le compte à rebours pour la prochaine capture
      logDebug(`[Capture] Resetting countdown to ${intervalSeconds} seconds after capture`);
      setCountdown(intervalSeconds);
      
      return imageUrl;
      
    } catch (error) {
      logError("[Capture] Screenshot error:", error);
      handleCaptureError(error);
      return null;
    }
  }, [status, intervalSeconds, autoUpload, offline]);
  
  // Utiliser le hook useTimer pour gérer le compte à rebours
  const { countdown: timerCountdown, setCountdown: setTimerCountdown } = useTimer(
    intervalSeconds,
    status,
    takeScreenshot
  );
  
  // Synchroniser le compte à rebours entre useTimer et useScreenCapture
  useEffect(() => {
    setCountdown(timerCountdown);
  }, [timerCountdown]);
  
  // Synchroniser le compte à rebours de useTimer avec celui de useScreenCapture
  useEffect(() => {
    setTimerCountdown(countdown);
  }, [countdown, setTimerCountdown]);
  
  /**
   * Toggle the capture state
   */
  const toggleCapture = useCallback(() => {
    logDebug(`[Capture] Toggle requested, current status: ${status}`);
    
    if (status === "idle" || status === "error") {
      initCapture();
    } else {
      stopCapture();
      setStatus("idle");
      logDebug("[Capture] System stopped");
      toast.info("Capture arrêtée");
    }
  }, [status, stopCapture]);
  
  /**
   * Initialize capture system
   */
  const initCapture = useCallback(async () => {
    try {
      if (status === "active" || status === "requesting-permission") {
        logDebug("[Capture] Already running, skipping initialization");
        return;
      }
      
      if (suppressPermissionPrompt) {
        logDebug("[Capture] Permission prompt suppressed");
        setSdkDisabled(true);
        return;
      }
      
      logDebug(`[Capture] Starting permission request`);
      
      // Clear any existing errors
      setError(null);
      
      // Request media permissions
      const success = await requestPermission();
      
      if (success) {
        logDebug("[Capture] System initialized successfully");
        toast.success("Capture d'écran initialisée");
        
        // S'assurer que le compte à rebours est initialisé à la bonne valeur
        logDebug(`[Capture] Setting initial countdown to ${intervalSeconds} seconds`);
        setCountdown(intervalSeconds);
      }
      
    } catch (error) {
      logError("[Capture] Initialization error:", error);
      handleCaptureError(error);
    }
  }, [status, intervalSeconds, suppressPermissionPrompt, requestPermission]);
  
  /**
   * Handle capture errors
   */
  const handleCaptureError = useCallback((error: any) => {
    stopCapture();
    
    setStatus("error");
    setError(error instanceof Error ? error : new Error(String(error)));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError("[Capture] Error:", errorMessage);
    
    if (errorMessage.includes("Permission denied") || errorMessage.includes("Permission not granted")) {
      toast.error("Permission refusée", {
        description: "Vous devez autoriser le partage d'écran pour utiliser cette fonctionnalité.",
      });
    } else if (errorMessage.includes("user denied") || errorMessage.includes("user cancelled")) {
      toast.info("Capture annulée", {
        description: "Vous avez annulé le partage d'écran.",
      });
    } else {
      toast.error("Erreur de capture", {
        description: errorMessage.substring(0, 100),
      });
    }
  }, [stopCapture]);
  
  // Auto-start on mount if configured
  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      logDebug("[Capture] Auto-starting capture...");
      initCapture();
    }
    
    // Clean up on unmount
    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [autoStart, initCapture, status, suppressPermissionPrompt, stopCapture]);
  
  // Function to get diagnostic information
  const getDiagnostics = useCallback(() => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStreamRef.current,
      lastError: error?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      configuration: {...configRef.current},
      browserInfo: navigator.userAgent,
      isSdkDisabled: configRef.current.disableAdvancedSDK,
      permissionAttempted: permissionAttemptRef.current,
      permissionInProgress: permissionInProgressRef.current,
      intervalSeconds: intervalSeconds,
      interval: interval
    };
  }, [status, countdown, error, intervalSeconds, interval]);
  
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
