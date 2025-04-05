
import { useEffect, useRef, useState, useCallback } from 'react';
import { createLogger } from './logger';

const { logDebug } = createLogger();

/**
 * Hook to manage capture timer logic
 */
export const useTimer = (
  status: string,
  captureCallback: () => Promise<any>
) => {
  const [countdown, setCountdown] = useState<number>(10); // Default to 10 seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const captureCallbackRef = useRef(captureCallback);
  
  // Update the callback ref when the callback changes
  useEffect(() => {
    captureCallbackRef.current = captureCallback;
  }, [captureCallback]);
  
  // Reset countdown when status changes to active
  useEffect(() => {
    if (status === 'active') {
      logDebug(`Resetting countdown because status changed to active`);
      // We don't reset the countdown here as it's now handled by setCountdown from outside
    }
  }, [status]);
  
  // Set up the countdown timer
  useEffect(() => {
    // Clear existing timer on any status change
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (status !== 'active') {
      return;
    }
    
    logDebug(`Starting countdown timer`);
    
    // Set up the interval timer - ONE interval only
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setCountdown(prevCountdown => {
        // Get the new countdown value, cycling back to the initial value when it reaches 1
        const newCountdown = prevCountdown <= 1 ? countdown : prevCountdown - 1;
        
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
  }, [status, countdown]);
  
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
  
  return { countdown, setCountdown };
};
