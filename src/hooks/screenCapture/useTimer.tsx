
import { useEffect, useRef, useState, useCallback } from 'react';
import { createLogger } from './logger';

const { logDebug } = createLogger();

/**
 * Hook to manage capture timer logic
 */
export const useTimer = (
  captureCallback: () => void
) => {
  const [countdown, setCountdown] = useState<number>(10); // Default to 10 seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const captureCallbackRef = useRef(captureCallback);
  const intervalValueRef = useRef<number>(countdown);
  
  // Update the callback ref when the callback changes
  useEffect(() => {
    captureCallbackRef.current = captureCallback;
  }, [captureCallback]);
  
  // Wrapped setCountdown to also update the interval reference
  const setCountdownValue = useCallback((value: number) => {
    logDebug(`Setting countdown to ${value} seconds explicitly`);
    intervalValueRef.current = value;
    setCountdown(value);
  }, []);
  
  // Set up the countdown timer
  useEffect(() => {
    // Clear existing timer on any status change
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    logDebug(`Starting countdown timer`);
    
    // Set up the interval timer - ONE interval only
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setCountdown(prevCountdown => {
        // Get the new countdown value
        const newCountdown = prevCountdown <= 1 ? intervalValueRef.current : prevCountdown - 1;
        
        // Log the countdown change
        logDebug(`Countdown: ${prevCountdown} -> ${newCountdown}`);
        
        // Trigger capture when countdown reaches 1
        if (prevCountdown <= 1 && isMountedRef.current) {
          // Execute the capture callback
          logDebug("Countdown reached threshold, triggering capture callback");
          try {
            captureCallbackRef.current();
          } catch (error) {
            logDebug(`Error in capture callback: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        return newCountdown;
      });
    }, 1000);  // Always use 1000ms (1 second) for the countdown
    
    // Cleanup timer on unmount or status change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  // Handle component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  return { countdown, setCountdown: setCountdownValue };
};
