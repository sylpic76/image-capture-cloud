
import { useCallback, useEffect, useRef } from 'react';
import { createLogger } from './logger';
import { toast } from 'sonner';
import { requestMediaPermission, stopMediaTracks } from './mediaStream';

const { logDebug, logError } = createLogger();

/**
 * Hook to handle media stream acquisition and cleanup
 */
export const useMediaStream = (
  status: string,
  configRef: React.RefObject<any>,
  permissionAttemptRef: React.RefObject<boolean>,
  permissionInProgressRef: React.RefObject<boolean>,
  setActiveStatus: () => void,
  setErrorStatus: (error: Error) => void,
  setRequestingStatus: () => void,
  intervalSeconds: number,
  setCountdown: (value: number) => void
) => {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  
  // Request permissions with improved event handling
  const requestPermission = useCallback(async () => {
    // Avoid multiple simultaneous permission requests
    if (permissionInProgressRef.current) {
      logDebug("Permission request already in progress, skipping");
      return false;
    }

    // If we already have an active stream, no need to request permission again
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      logDebug("Media stream already active, using existing stream");
      setActiveStatus();
      setCountdown(intervalSeconds);
      return true;
    }

    try {
      logDebug("Requesting screen capture permission...");
      setRequestingStatus();
      
      if (permissionAttemptRef && 'current' in permissionAttemptRef) {
        permissionAttemptRef.current = true;
      }
      
      if (permissionInProgressRef && 'current' in permissionInProgressRef) {
        permissionInProgressRef.current = true;
      }
      
      // Use the extracted media permission function
      const stream = await requestMediaPermission(configRef);
      
      // Reset the in-progress flag
      if (permissionInProgressRef && 'current' in permissionInProgressRef) {
        permissionInProgressRef.current = false;
      }
      
      if (!stream) {
        throw new Error("Failed to obtain media stream");
      }
      
      // Add track ended event listeners
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          logDebug(`Track ${track.id} ended naturally by user or system`);
          if (mountedRef.current) {
            stopCapture();
          }
        });
      });
      
      // Store the stream in ref
      mediaStreamRef.current = stream;
      
      if (mountedRef.current) {
        setActiveStatus();
        logDebug("Media stream obtained successfully, status set to active");
        
        // Start the countdown immediately for the first capture
        setCountdown(intervalSeconds);
      }
      
      return true;
    } catch (error) {
      // Reset the in-progress flag on error
      if (permissionInProgressRef && 'current' in permissionInProgressRef) {
        permissionInProgressRef.current = false;
      }
      
      logError("Permission request failed", error);
      
      if (mountedRef.current) {
        setErrorStatus(error instanceof Error ? error : new Error(String(error)));
        toast.error("Permission de capture d'écran refusée. Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.");
      }
      
      return false;
    }
  }, [configRef, intervalSeconds, setActiveStatus, setCountdown, setErrorStatus, setRequestingStatus]);

  // Stop the capture and clean up resources
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    // Stop all media tracks using the extracted function
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [stopCapture]);

  return {
    mediaStreamRef,
    requestPermission,
    stopCapture,
    mountedRef
  };
};
