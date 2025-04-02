
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
    if (status !== 'active') {
      // Clear any existing timer if not active
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // If active, set up countdown
    if (!timerRef.current) {
      // Immediately tick once to start
      const tick = async () => {
        setCountdown(prevCountdown => {
          const newCountdown = prevCountdown <= 1 ? intervalSeconds : prevCountdown - 1;
          
          // When countdown reaches threshold, trigger capture
          if (prevCountdown <= 1) {
            logDebug("Countdown reached threshold, triggering capture callback");
            captureCallback();
          }
          
          logDebug(`Countdown: ${prevCountdown} -> ${newCountdown}`);
          return newCountdown;
        });
      };
      
      // Start the timer
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    
    // Cleanup timer on unmount or status change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [intervalSeconds, status, captureCallback]);
  
  return { countdown, setCountdown };
};
