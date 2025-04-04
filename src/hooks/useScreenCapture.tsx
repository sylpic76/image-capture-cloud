
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const permissionAttemptRef = useRef<boolean>(false);
  const permissionInProgressRef = useRef<boolean>(false);
  
  // Configuration defaults
  const {
    autoStart = false,
    interval = 30000,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false,
  } = config || {};

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
    },
    (err) => {
      setStatus("error");
      setError(err);
    },
    () => {
      setStatus("requesting-permission");
      setCountdown(countdownSeconds);
    },
    Math.floor(interval / 1000),
    setCountdown
  );
  
  /**
   * Start timer for countdown or regular captures
   */
  const startTimer = useCallback((duration: number, interval: number, callback: (remaining: number) => void) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    let remaining = duration;
    
    const tick = () => {
      if (!mountedRef.current) return;
      
      remaining -= 1;
      callback(remaining);
      
      if (remaining > 0) {
        timerRef.current = setTimeout(tick, interval);
      }
    };
    
    timerRef.current = setTimeout(tick, interval);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Stop timer
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
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
        // Start countdown to first capture
        startTimer(countdownSeconds, 1000, (remaining) => {
          setCountdown(remaining);
          
          if (remaining === 0) {
            takeScreenshot();
          }
        });
        
        logDebug("[Capture] System initialized successfully");
        toast.success("Capture d'écran initialisée");
      }
      
    } catch (error) {
      logError("[Capture] Initialization error:", error);
      handleCaptureError(error);
    }
  }, [status, countdownSeconds, suppressPermissionPrompt, startTimer, requestPermission]);
  
  /**
   * Take a screenshot
   */
  const takeScreenshot = useCallback(async () => {
    if (status !== "active" || !mediaStreamRef.current) {
      logDebug("[Capture] Cannot take screenshot - system not running or no stream");
      return;
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
      
      // Reset countdown for next capture
      setCountdown(Math.floor(interval / 1000));
      
      // Start timer for next capture
      startTimer(Math.floor(interval / 1000), 1000, (remaining) => {
        setCountdown(remaining);
        
        if (remaining === 0) {
          takeScreenshot();
        }
      });
      
      return imageUrl;
      
    } catch (error) {
      logError("[Capture] Screenshot error:", error);
      handleCaptureError(error);
      return null;
    }
  }, [status, interval, startTimer]);
  
  /**
   * Toggle the capture state
   */
  const toggleCapture = useCallback(() => {
    logDebug(`[Capture] Toggle requested, current status: ${status}`);
    
    if (status === "idle" || status === "error") {
      initCapture();
    } else {
      stopTimer();
      stopCapture();
      setStatus("idle");
      logDebug("[Capture] System stopped");
      toast.info("Capture arrêtée");
    }
  }, [status, initCapture, stopCapture, stopTimer]);
  
  /**
   * Handle capture errors
   */
  const handleCaptureError = useCallback((error: any) => {
    stopTimer();
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
  }, [stopTimer, stopCapture]);
  
  // Auto-start on mount if configured
  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      logDebug("[Capture] Auto-starting capture...");
      initCapture();
    }
    
    // Clean up on unmount
    return () => {
      mountedRef.current = false;
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
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
      permissionInProgress: permissionInProgressRef.current
    };
  }, [status, countdown, error]);
  
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
