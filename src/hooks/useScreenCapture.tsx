
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
  const mediaStreamRef = useRef<MediaStream | null>(null);
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
        console.log("[Capture] Already running, skipping initialization");
        return;
      }
      
      if (suppressPermissionPrompt) {
        console.log("[Capture] Permission prompt suppressed");
        setSdkDisabled(true);
        return;
      }
      
      setStatus("requesting-permission");
      setCountdown(countdownSeconds);
      
      console.log(`[Capture] Starting permission request`);
      
      // Get display media stream
      permissionInProgressRef.current = true;
      permissionAttemptRef.current = true;
      
      try {
        // Request media permissions
        const stream = await requestMediaPermission(configRef);
        
        if (!stream) {
          throw new Error("Failed to get display media stream");
        }
        
        if (!mountedRef.current) {
          logDebug("Component unmounted during permission request, cleaning up");
          stopMediaTracks(stream);
          permissionInProgressRef.current = false;
          return;
        }
        
        // Success: set up stream and start capture
        logDebug("Screen capture permission granted");
        
        // Set up handlers for when user stops sharing
        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            logDebug("User stopped sharing screen");
            if (mountedRef.current) {
              stopCapture();
            }
          };
        });
        
        // Store the stream reference
        mediaStreamRef.current = stream;
        
        // Set active status and restart countdown
        setStatus("active");
        setCountdown(countdownSeconds);
        setError(null);
        
        // Start countdown to first capture
        startTimer(countdownSeconds, 1000, (remaining) => {
          setCountdown(remaining);
          
          if (remaining === 0) {
            takeScreenshot();
          }
        });
        
        permissionInProgressRef.current = false;
        console.log("[Capture] System initialized successfully");
        toast.success("Capture d'écran initialisée");
        
      } catch (err) {
        permissionInProgressRef.current = false;
        throw err;
      }
      
    } catch (error) {
      console.error("[Capture] Initialization error:", error);
      handleCaptureError(error);
    }
  }, [status, countdownSeconds, suppressPermissionPrompt, startTimer]);
  
  /**
   * Take a screenshot
   */
  const takeScreenshot = useCallback(async () => {
    if (status !== "active" || !mediaStreamRef.current) {
      console.log("[Capture] Cannot take screenshot - system not running or no stream");
      return;
    }
    
    console.log("[Capture] Capturing screenshot...");
    
    try {
      const currentStream = mediaStreamRef.current;
      
      // Increment the capture counter
      const captureId = captureCountRef.current + 1;
      captureCountRef.current = captureId;
      
      console.log(`[Capture] Taking screenshot #${captureId}`);
      
      // Capture the screen
      const imageUrl = await captureScreen(
        currentStream,
        status,
        () => captureCountRef.current,
        () => { successCountRef.current += 1; },
        () => { failureCountRef.current += 1; },
        (url) => {
          console.log(`[Capture] Setting last capture URL: ${url.substring(0, 50)}...`);
        }
      );
      
      // if image upload is enabled and we're not in offline mode
      if (autoUpload && !offline && imageUrl) {
        console.log("[Capture] Auto-uploading captured image");
        
        // Fetch back the latest screenshot
        try {
          await fetchLatestScreenshot(setImageProcessingStatus);
        } catch (err) {
          console.error("[Capture] Error fetching latest screenshot:", err);
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
      console.error("[Capture] Screenshot error:", error);
      handleCaptureError(error);
      return null;
    }
  }, [status, interval, startTimer]);
  
  /**
   * Stop the capture system
   */
  const stopCapture = useCallback(() => {
    stopTimer();
    
    if (mediaStreamRef.current) {
      stopMediaTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    
    setStatus("idle");
    console.log("[Capture] System stopped");
    toast.info("Capture arrêtée");
  }, [stopTimer]);
  
  /**
   * Toggle the capture state
   */
  const toggleCapture = useCallback(() => {
    if (status === "idle" || status === "error") {
      initCapture();
    } else {
      stopCapture();
    }
  }, [status, initCapture, stopCapture]);
  
  /**
   * Handle capture errors
   */
  const handleCaptureError = useCallback((error: any) => {
    stopTimer();
    
    if (mediaStreamRef.current) {
      stopMediaTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    
    setStatus("error");
    setError(error instanceof Error ? error : new Error(String(error)));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Capture] Error:", errorMessage);
    
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
  }, [stopTimer]);
  
  // Auto-start on mount if configured
  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      console.log("[Capture] Auto-starting capture...");
      initCapture();
    }
    
    // Clean up on unmount
    return () => {
      mountedRef.current = false;
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        stopMediaTracks(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
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
