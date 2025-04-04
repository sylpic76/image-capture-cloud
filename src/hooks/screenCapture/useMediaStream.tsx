
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from './logger';
import { requestMediaPermission, stopMediaTracks } from './mediaStream';

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
      
      // Set active status and explicitly set countdown to intervalSeconds
      if (mountedRef.current) {
        setActiveStatus();
        // Assurons-nous de réinitialiser le compte à rebours avec la bonne valeur
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
  const stopStreamTracks = useCallback((stream) => {
    if (!stream) return;
    stopMediaTracks(stream);
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
