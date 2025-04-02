
import { useCallback, useRef, useEffect } from 'react';
import { createLogger } from './logger';
import { requestMediaPermission, stopMediaTracks } from './mediaStream';

const { logDebug, logError } = createLogger();

/**
 * Hook to manage media stream permissions and state
 */
export const useMediaStream = (
  status: string,
  configRef: React.MutableRefObject<any>,
  permissionAttemptRef: React.MutableRefObject<boolean>,
  permissionInProgressRef: React.MutableRefObject<boolean>,
  setActiveStatus: () => void,
  setErrorStatus: (error: Error) => void,
  setRequestingStatus: () => void,
  intervalSeconds: number,
  setCountdown: (seconds: number) => void
) => {
  // Store mediaStream in a ref to avoid re-renders
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef<boolean>(true);
  
  // Reset countdown and request screen capture permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionInProgressRef.current) {
      logDebug("Permission already being requested, ignoring duplicate request");
      return false;
    }
    
    try {
      setRequestingStatus();
      permissionInProgressRef.current = true;
      
      // Set this to true - we've attempted to get permission at least once
      permissionAttemptRef.current = true;
      
      const stream = await requestMediaPermission({
        audio: false,
        video: true,
        preferCurrentTab: !configRef.current.disableAdvancedSDK,
      });
      
      // If component unmounted during permission request, cleanup and return
      if (!mountedRef.current) {
        stopMediaTracks(stream);
        return false;
      }
      
      mediaStreamRef.current = stream;
      
      // Reset countdown when starting fresh capture
      setCountdown(intervalSeconds);
      setActiveStatus();
      
      return true;
    } catch (error) {
      if (mountedRef.current) {
        logError("Failed to get screen capture permission", error);
        setErrorStatus(error instanceof Error ? error : new Error(String(error)));
      }
      return false;
    } finally {
      if (mountedRef.current) {
        permissionInProgressRef.current = false;
      }
    }
  }, [configRef, permissionAttemptRef, permissionInProgressRef, setActiveStatus, setErrorStatus, setRequestingStatus, intervalSeconds, setCountdown]);
  
  // Stop media tracks and clean up resources
  const stopCapture = useCallback(() => {
    if (mediaStreamRef.current) {
      stopMediaTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopCapture();
    };
  }, [stopCapture]);
  
  return { mediaStreamRef, requestPermission, stopCapture, mountedRef };
};
