
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from './logger';

const { logDebug, logError } = createLogger();

/**
 * Hook to manage the media stream for screen capture
 */
export const useMediaStream = (
  status,
  configRef,
  permissionAttemptRef,
  permissionInProgressRef,
  setActiveStatus,
  setErrorStatus,
  setRequestingStatus,
  intervalSeconds,
  setCountdown
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
    
    permissionInProgressRef.current = true;
    permissionAttemptRef.current = true;
    
    // Update UI state
    if (mountedRef.current) {
      setRequestingStatus();
    }
    
    try {
      // Set up media constraints based on config
      const constraints = {
        video: {
          cursor: configRef.current.showCursor ? "always" : "never",
          displaySurface: "monitor"
        },
        audio: false  // No audio capture
      };
      
      // Request screen capture
      logDebug(`Requesting screen capture with constraints: ${JSON.stringify(constraints)}`);
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      if (!mountedRef.current) {
        logDebug("Component unmounted during permission request, cleaning up");
        stopStreamTracks(stream);
        permissionInProgressRef.current = false;
        return false;
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
      if (mountedRef.current) {
        setActiveStatus();
        setCountdown(intervalSeconds);
      }
      
      permissionInProgressRef.current = false;
      return true;
    } catch (error) {
      if (!mountedRef.current) {
        logDebug("Component unmounted during error handling, ignoring error");
        permissionInProgressRef.current = false;
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
      
      permissionInProgressRef.current = false;
      return false;
    }
  }, [setActiveStatus, setErrorStatus, setRequestingStatus, configRef, permissionAttemptRef, permissionInProgressRef, intervalSeconds, setCountdown]);
  
  // Stop all tracks and clear stream
  const stopStreamTracks = useCallback((stream) => {
    if (!stream) return;
    
    logDebug("Stopping all stream tracks");
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }, []);
  
  // Stop capture and clean up
  const stopCapture = useCallback(() => {
    logDebug("Stopping capture");
    
    if (mediaStreamRef.current) {
      stopStreamTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
  }, [stopStreamTracks]);
  
  return { mediaStreamRef, requestPermission, stopCapture, mountedRef };
};
