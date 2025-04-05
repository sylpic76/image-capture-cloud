
import { useCallback, useEffect, useRef, MutableRefObject } from 'react';
import { createLogger } from './logger';
import { requestMediaPermission, stopMediaTracks } from './mediaStream';
import { ScreenCaptureConfig, ScreenCaptureStatus } from './types';

const { logDebug, logError } = createLogger();

/**
 * Hook to manage the media stream for screen capture
 */
export const useMediaStream = (
  status: ScreenCaptureStatus,
  configRef: MutableRefObject<ScreenCaptureConfig>,
  permissionAttemptRef: MutableRefObject<boolean>,
  permissionInProgressRef: MutableRefObject<boolean>,
  setActiveStatus: () => void,
  setErrorStatus: (error: Error) => void,
  setRequestingStatus: () => void,
  intervalSeconds: number,
  setCountdown: (seconds: number) => void
) => {
  // References to maintain stream and mount status
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    // Reset the mounted ref to true when the component is mounted
    mountedRef.current = true;
    
    return () => {
      logDebug("Component unmounting, cleaning up resources");
      mountedRef.current = false;
      stopCapture();
    };
  }, []);
  
  // Request screen capture permission and set up stream
  const requestPermission = useCallback(async () => {
    // Always assume we're mounted during the active request
    // This fixes the issue where the permission dialog appears but the component
    // is incorrectly considered unmounted
    mountedRef.current = true;
    
    if (permissionInProgressRef.current) {
      logDebug("Permission request already in progress, skipping");
      return false;
    }
    
    try {
      permissionInProgressRef.current = true;
      permissionAttemptRef.current = true;
      
      // Update UI state
      setRequestingStatus();
      
      logDebug("Starting screen capture permission request...");
      
      // Request media permission with proper error handling
      const stream = await requestMediaPermission(configRef);
      
      // Check if stream was returned
      if (!stream) {
        logDebug("No stream returned but no error thrown");
        permissionInProgressRef.current = false;
        setErrorStatus(new Error("Failed to obtain media stream"));
        return false;
      }
      
      // Success: set up stream and start capture
      logDebug("[useMediaStream] ✅ Permission granted, setting stream and activating capture");
      
      // Store the stream reference
      mediaStreamRef.current = stream;
      
      // Set up handlers for when user stops sharing
      stream.getVideoTracks().forEach(track => {
        logDebug(`Setting up track ended handler for track: ${track.id}`);
        track.onended = () => {
          logDebug("User stopped sharing screen");
          stopCapture();
        };
      });
      
      // Set active status and explicitly set countdown to intervalSeconds
      setActiveStatus();
      logDebug(`Setting countdown to ${intervalSeconds} seconds after permission granted`);
      setCountdown(intervalSeconds);
      
      permissionInProgressRef.current = false;
      return true;
    } catch (error) {
      // Always reset the permission flag, even on error
      permissionInProgressRef.current = false;
      
      // Handle permission denied or other errors
      const errorMessage = `Screen capture permission error: ${error instanceof Error ? error.message : String(error)}`;
      logError(errorMessage);
      
      if (error instanceof Error && error.name === "NotAllowedError") {
        setErrorStatus(new Error("Permission denied for screen capture"));
      } else {
        setErrorStatus(error instanceof Error ? error : new Error(String(error)));
      }
      
      return false;
    }
  }, [setActiveStatus, setErrorStatus, setRequestingStatus, configRef, permissionAttemptRef, permissionInProgressRef, intervalSeconds, setCountdown]);
  
  // Stop all tracks and clear stream
  const stopStreamTracks = useCallback(() => {
    if (!mediaStreamRef.current) return;
    
    logDebug("Stopping stream tracks");
    stopMediaTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;
  }, []);
  
  // Stop capture and clean up
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture from useMediaStream");
    
    if (mediaStreamRef.current) {
      stopStreamTracks();
      mediaStreamRef.current = null;
    }
  }, [stopStreamTracks]);
  
  return { mediaStreamRef, requestPermission, stopCapture, mountedRef };
};
