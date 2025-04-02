
import { useCallback, useEffect } from 'react';
import { createLogger } from './logger';
import { ScreenCaptureDiagnostics } from './types';

const { logDebug } = createLogger();

/**
 * Hook to provide diagnostic information about screen capture
 */
export const useDiagnostics = (
  status: string,
  countdown: number,
  mediaStreamRef: React.RefObject<MediaStream | null>,
  lastError: Error | null,
  captureCountRef: React.RefObject<number>,
  successCountRef: React.RefObject<number>,
  failureCountRef: React.RefObject<number>,
  configRef: React.RefObject<any>,
  permissionAttemptRef: React.RefObject<boolean>,
  permissionInProgressRef: React.RefObject<boolean>
) => {
  // Log capture statistics periodically
  useEffect(() => {
    const statsInterval = setInterval(() => {
      if (status === 'active') {
        logDebug(`Capture stats: attempts=${captureCountRef.current}, success=${successCountRef.current}, failures=${failureCountRef.current}, config=${JSON.stringify(configRef.current)}`);
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [status, captureCountRef, successCountRef, failureCountRef, configRef]);
  
  // Function to get comprehensive diagnostic information
  const getDiagnostics = useCallback((): ScreenCaptureDiagnostics => {
    return {
      status,
      countdown,
      hasMediaStream: !!mediaStreamRef.current,
      lastError: lastError?.message || null,
      captures: captureCountRef.current,
      successful: successCountRef.current,
      failed: failureCountRef.current,
      configuration: {...configRef.current},
      browserInfo: navigator.userAgent,
      isSdkDisabled: configRef.current.disableAdvancedSDK,
      permissionAttempted: permissionAttemptRef.current,
      permissionInProgress: permissionInProgressRef.current
    };
  }, [status, countdown, mediaStreamRef, lastError, captureCountRef, successCountRef, failureCountRef, configRef, permissionAttemptRef, permissionInProgressRef]);
  
  return {
    getDiagnostics
  };
};
