
import { useCallback, useRef, useState } from 'react';
import { createLogger } from './logger';
import { ScreenCaptureConfig, ScreenCaptureStatus } from './types';
import { lockConfiguration } from './config';

const { logDebug } = createLogger();

/**
 * Hook to manage capture state and counters
 */
export const useCaptureState = (config = {}) => {
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Capture statistics counters
  const captureCountRef = useRef(0);
  const successCountRef = useRef(0);
  const failureCountRef = useRef(0);
  
  // Configuration reference
  const configRef = useRef<ScreenCaptureConfig>(lockConfiguration(config));
  
  // Avoid multiple permission requests
  const permissionAttemptRef = useRef(false);
  const permissionInProgressRef = useRef(false);
  
  // Track if capture is in progress
  const isCapturingRef = useRef(false);
  
  // Counter management functions
  const incrementCaptureCount = useCallback(() => {
    captureCountRef.current++;
    return captureCountRef.current;
  }, []);

  const incrementSuccessCount = useCallback(() => {
    successCountRef.current++;
  }, []);

  const incrementFailureCount = useCallback(() => {
    failureCountRef.current++;
  }, []);
  
  // Status setters
  const setActiveStatus = useCallback(() => {
    setStatus('active');
    logDebug('Status set to active');
  }, []);
  
  const setPauseStatus = useCallback(() => {
    setStatus('paused');
    logDebug('Status set to paused');
  }, []);
  
  const setIdleStatus = useCallback(() => {
    setStatus('idle');
    logDebug('Status set to idle');
  }, []);
  
  const setErrorStatus = useCallback((error: Error) => {
    setStatus('error');
    setLastError(error);
    logDebug(`Status set to error: ${error.message}`);
  }, []);
  
  const setRequestingStatus = useCallback(() => {
    setStatus('requesting-permission');
    logDebug('Status set to requesting-permission');
  }, []);

  return {
    status,
    lastCaptureUrl,
    setLastCaptureUrl,
    lastError,
    setLastError,
    captureCountRef,
    successCountRef,
    failureCountRef,
    configRef,
    permissionAttemptRef,
    permissionInProgressRef,
    isCapturingRef,
    incrementCaptureCount,
    incrementSuccessCount,
    incrementFailureCount,
    setActiveStatus,
    setPauseStatus,
    setIdleStatus,
    setErrorStatus,
    setRequestingStatus
  };
};
