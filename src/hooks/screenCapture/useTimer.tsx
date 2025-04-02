
import { useEffect, useRef, useState } from 'react';
import { createLogger } from './logger';

const { logDebug } = createLogger();

/**
 * Hook to manage capture timer logic
 */
export const useTimer = (
  intervalSeconds: number,
  status: string,
  captureCallback: () => Promise<void>
) => {
  const [countdown, setCountdown] = useState<number>(intervalSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Reset countdown when status changes to active
  useEffect(() => {
    if (status === 'active') {
      setCountdown(intervalSeconds);
    }
  }, [status, intervalSeconds]);
  
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
    
    // Start a new timer only if status is active
    logDebug(`Starting countdown timer with ${intervalSeconds} second interval`);
    
    // Set up the interval timer - ONE interval only
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setCountdown(prevCountdown => {
        const newCountdown = prevCountdown <= 1 ? intervalSeconds : prevCountdown - 1;
        
        // Log the countdown change
        logDebug(`Countdown: ${prevCountdown} -> ${newCountdown}`);
        
        // Trigger capture when countdown reaches 1
        if (prevCountdown <= 1 && isMountedRef.current) {
          logDebug("Countdown reached threshold, triggering capture callback");
          captureCallback();
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
  }, [status, intervalSeconds, captureCallback]);
  
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
