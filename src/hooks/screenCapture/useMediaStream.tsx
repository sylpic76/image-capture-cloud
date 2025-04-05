
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
  const mediaStreamRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      logDebug("Component unmounting, cleaning up resources");
      mountedRef.current = false;
      stopCapture();
    };
  }, []);
  
  // Request screen capture permission and set up stream
  const requestPermission = useCallback(async () => {
    if (!mountedRef.current) {
      logDebug("Component already unmounted, skipping permission request");
      return false;
    }
    
    if (permissionInProgressRef.current) {
      logDebug("Permission request already in progress, skipping");
      return false;
    }
    
    try {
      permissionInProgressRef.current = true;
      permissionAttemptRef.current = true;
      
      // Update UI state
      if (mountedRef.current) {
        setRequestingStatus();
      }
      
      logDebug("Starting screen capture permission request...");
      
      // Request media permission with proper error handling
      const stream = await requestMediaPermission(configRef);
      
      // Check if still mounted before proceeding
      if (!mountedRef.current) {
        logDebug("Component unmounted during permission request, cleaning up");
        stopMediaTracks(stream);
        permissionInProgressRef.current = false;
        return false;
      }
      
      // If no stream was returned but no error was thrown
      if (!stream) {
        logDebug("No stream returned but no error thrown");
        permissionInProgressRef.current = false;
        
        if (mountedRef.current) {
          setErrorStatus(new Error("Failed to obtain media stream"));
        }
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
          if (mountedRef.current) {
            stopCapture();
          }
        };
      });
      
      // Set active status and explicitly set countdown to intervalSeconds
      if (mountedRef.current) {
        // Activons explicitement le statut
        setActiveStatus();
        // Make sure to reset the countdown with the correct value
        logDebug(`Setting countdown to ${intervalSeconds} seconds after permission granted`);
        setCountdown(intervalSeconds);
      }
      
      permissionInProgressRef.current = false;
      return true;
    } catch (error) {
      // Always reset the permission flag, even on error
      permissionInProgressRef.current = false;
      
      if (!mountedRef.current) {
        logDebug("Component unmounted during error handling, ignoring error");
        return false;
      }
      
      // Handle permission denied or other errors
      logError("Screen capture permission error", error);
      
      if (mountedRef.current) {
        if (error.name === "NotAllowedError") {
          setErrorStatus(new Error("Permission denied for screen capture"));
        } else {
          setErrorStatus(error);
        }
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
