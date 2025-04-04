
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { captureScreen } from "./screenCapture/captureScreen";
import { useCaptureState } from "./screenCapture/useCaptureState";
import { useTimer } from "./screenCapture/useTimer";
import { useMediaStream } from "./screenCapture/useMediaStream";
import { useDiagnostics } from "./screenCapture/useDiagnostics";
import { uploadScreenshot } from "./screenCapture/utils/uploadUtils";
import { fetchLatestScreenshot } from "@/utils/screenshotUtils";
import { ImageProcessingStatus } from "@/types/assistant";

export interface CaptureConfig {
  autoStart?: boolean;
  interval?: number;
  captureCount?: number;
  autoUpload?: boolean;
  offline?: boolean;
  suppressPermissionPrompt?: boolean;
}

type CaptureState = "idle" | "running" | "countdown" | "capturing" | "paused" | "error";

/**
 * Hook to capture screenshots from display
 */
export const useScreenCapture = (countdownSeconds = 3, config?: CaptureConfig) => {
  const captureState = useCaptureState();
  const { startTimer, stopTimer, remainingTime } = useTimer();
  const { getDisplayMedia, stream, releaseStream } = useMediaStream();
  const { trackDiagnostics, getDiagnostics } = useDiagnostics();
  
  const [status, setStatus] = useState<CaptureState>("idle");
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [error, setError] = useState<Error | null>(null);
  const [sdkDisabled, setSdkDisabled] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  
  // Configuration defaults
  const {
    autoStart = false,
    interval = 30000,
    captureCount = Infinity,
    autoUpload = true,
    offline = false,
    suppressPermissionPrompt = false,
  } = config || {};
  
  /**
   * Initialize capture system
   */
  const initCapture = useCallback(async () => {
    try {
      if (status === "running" || status === "countdown" || status === "capturing") {
        console.log("[Capture] Already running, skipping initialization");
        return;
      }
      
      if (suppressPermissionPrompt) {
        console.log("[Capture] Permission prompt suppressed");
        setSdkDisabled(true);
        return;
      }
      
      setStatus("countdown");
      setCountdown(countdownSeconds);
      
      console.log(`[Capture] Starting countdown from ${countdownSeconds} seconds`);
      
      startTimer(countdownSeconds, 1000, async (remaining) => {
        setCountdown(remaining);
        
        if (remaining === 0) {
          try {
            setStatus("capturing");
            
            // Get display media stream
            const displayStream = await getDisplayMedia();
            
            if (!displayStream) {
              throw new Error("Failed to get display media stream");
            }

            captureState.setCaptureActive(true);
            captureState.setStream(displayStream);
            setStatus("running");
            
            // Log success
            console.log("[Capture] System initialized successfully");
            toast.success("Capture d'écran initialisée");
            
            // Take first screenshot
            await takeScreenshot();
            
          } catch (error) {
            console.error("[Capture] Error during initialization:", error);
            handleCaptureError(error);
          }
        }
      });
      
    } catch (error) {
      console.error("[Capture] Initialization error:", error);
      handleCaptureError(error);
    }
  }, [status, countdownSeconds, suppressPermissionPrompt, startTimer, getDisplayMedia]);
  
  /**
   * Take a screenshot
   */
  const takeScreenshot = useCallback(async () => {
    if (status !== "running" || !captureState.stream) {
      console.log("[Capture] Cannot take screenshot - system not running or no stream");
      return;
    }
    
    setStatus("capturing");
    
    try {
      console.log("[Capture] Capturing screenshot...");
      trackDiagnostics("capture-start");
      
      // Capture the screen
      const { blob, base64 } = await captureScreen(captureState.stream);
      
      trackDiagnostics("capture-complete");
      
      // Store locally or upload
      if (autoUpload && !offline) {
        console.log("[Capture] Uploading screenshot...");
        trackDiagnostics("upload-start");
        
        await uploadScreenshot(blob);
        
        trackDiagnostics("upload-complete");
        
        // Fetch back the latest screenshot
        try {
          // Correct call with one parameter to match function definition
          await fetchLatestScreenshot(setImageProcessingStatus);
        } catch (error) {
          console.error("[Capture] Error fetching latest screenshot:", error);
        }
        
        console.log("[Capture] Screenshot uploaded successfully");
      } else {
        console.log("[Capture] Screenshot captured (not uploaded - offline mode)");
      }
      
      setStatus("running");
      
    } catch (error) {
      console.error("[Capture] Screenshot error:", error);
      handleCaptureError(error);
    }
  }, [status, captureState.stream, autoUpload, offline, trackDiagnostics]);
  
  /**
   * Stop the capture system
   */
  const stopCapture = useCallback(() => {
    stopTimer();
    releaseStream();
    captureState.setCaptureActive(false);
    captureState.setStream(null);
    setStatus("idle");
    console.log("[Capture] System stopped");
    toast.info("Capture arrêtée");
  }, [stopTimer, releaseStream, captureState]);
  
  /**
   * Toggle the capture state
   */
  const toggleCapture = useCallback(() => {
    if (status === "idle") {
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
    releaseStream();
    captureState.setCaptureActive(false);
    captureState.setStream(null);
    
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
  }, [stopTimer, releaseStream, captureState]);
  
  // Auto-start on mount if configured
  useEffect(() => {
    if (autoStart && status === "idle" && !suppressPermissionPrompt) {
      console.log("[Capture] Auto-starting capture...");
      initCapture();
    }
    
    // Stop the capture when the component unmounts
    return () => {
      if (status !== "idle") {
        console.log("[Capture] Cleaning up...");
        stopCapture();
      }
    };
  }, [autoStart, initCapture, status, suppressPermissionPrompt, stopCapture]);
  
  return {
    status,
    countdown,
    error,
    takeScreenshot,
    initCapture,
    stopCapture,
    toggleCapture,
    isActive: captureState.captureActive,
    sdkDisabled,
    getDiagnostics,
  };
};
