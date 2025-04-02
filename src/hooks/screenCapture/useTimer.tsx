
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
    logDebug(`Starting countdown timer from ${countdown} with ${intervalSeconds} second interval`);
    
    // Define tick function
    const tick = async () => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          logDebug("Countdown reached threshold, triggering capture callback");
          captureCallback();
          return intervalSeconds; // Reset to initial interval
        } else {
          logDebug(`Countdown: ${prevCountdown} -> ${prevCountdown - 1}`);
          return prevCountdown - 1;
        }
      });
    };
    
    // Set up the interval timer
    timerRef.current = setInterval(tick, 1000);
    
    // Cleanup timer on unmount or status change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, intervalSeconds, captureCallback]);
  
  return { countdown, setCountdown };
};
