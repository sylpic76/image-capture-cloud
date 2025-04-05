
import { useState, useRef, useCallback } from 'react';
import { createLogger } from './logger';
import { ScreenCaptureStatus, ScreenCaptureConfig } from './types';

const { logDebug, logError } = createLogger();

/**
 * Hook to manage capture state
 */
export const useCaptureState = (config: ScreenCaptureConfig) => {
  // Current status of the screen capture
  const [status, setStatus] = useState<ScreenCaptureStatus>('idle');
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Refs for various counters and flags
  const captureCountRef = useRef<number>(0);
  const successCountRef = useRef<number>(0);
  const failureCountRef = useRef<number>(0);
  const configRef = useRef<ScreenCaptureConfig>(config);
  const permissionAttemptRef = useRef<boolean>(false);
  const permissionInProgressRef = useRef<boolean>(false);
  const isCapturingRef = useRef<boolean>(false);
  
  // Update config if it changes
  if (config !== configRef.current) {
    configRef.current = config;
  }
  
  // Counter increment functions
  const incrementCaptureCount = useCallback(() => {
    captureCountRef.current += 1;
    return captureCountRef.current;
  }, []);
  
  const incrementSuccessCount = useCallback(() => {
    successCountRef.current += 1;
    return successCountRef.current;
  }, []);
  
  const incrementFailureCount = useCallback(() => {
    failureCountRef.current += 1;
    return failureCountRef.current;
  }, []);
  
  // Status setter functions
  const setActiveStatus = useCallback(() => {
    setStatus('active');
    setLastError(null);
    logDebug("Status set to: active");
  }, []);
  
  const setPauseStatus = useCallback(() => {
    setStatus('paused');
    logDebug("Status set to: paused");
  }, []);
  
  const setIdleStatus = useCallback(() => {
    setStatus('idle');
    logDebug("Status set to: idle");
  }, []);
  
  const setErrorStatus = useCallback((error: Error) => {
    setStatus('error');
    setLastError(error);
    logError("Status set to: error", error);
  }, []);
  
  const setRequestingStatus = useCallback(() => {
    setStatus('requesting-permission');
    logDebug("Status set to: requesting-permission");
  }, []);
  
  return {
    status,
    lastCaptureUrl,
    setLastCaptureUrl,
    lastError,
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
    setRequestingStatus,
  };
};
