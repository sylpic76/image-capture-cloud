
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from './logger';

const { logDebug } = createLogger();

/**
 * Hook to manage countdown timer for screen captures
 */
export const useTimer = (
  intervalSeconds: number,
  status: string,
  onTimerComplete: () => void
) => {
  const [countdown, setCountdown] = useState(intervalSeconds);
  const timerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  // Timer reset function
  const resetTimer = useCallback(() => {
    if (mountedRef.current) {
      setCountdown(intervalSeconds);
    }
  }, [intervalSeconds]);

  // Recursive countdown function for reliable timing
  const recursiveCountdown = useCallback(async () => {
    if (!mountedRef.current || status !== 'active') return;
    
    // Decrement the counter
    setCountdown(prevCount => {
      const newCount = prevCount <= 1 ? intervalSeconds : prevCount - 1;
      logDebug(`Countdown: ${prevCount} -> ${newCount}`);
      return newCount;
    });
    
    // When countdown reaches 1, trigger capture
    if (countdown <= 1) {
      logDebug("Countdown reached threshold, triggering capture callback");
      try {
        await onTimerComplete();
      } catch (err) {
        console.error("Error during timer completion callback", err);
      }
      
      // Reset countdown after capture
      if (mountedRef.current) {
        resetTimer();
      }
    }
    
    // Schedule the next iteration if still active
    if (mountedRef.current && status === 'active') {
      timerRef.current = window.setTimeout(recursiveCountdown, 1000);
    }
  }, [status, countdown, intervalSeconds, onTimerComplete, resetTimer]);

  // Start or stop timer based on status
  useEffect(() => {
    if (status === 'active') {
      logDebug(`Starting countdown timer with interval: ${intervalSeconds}s`);
      
      // Start the recursive countdown
      if (timerRef.current === undefined) {
        recursiveCountdown();
      }
      
      // Cleanup function
      return () => {
        if (timerRef.current !== undefined) {
          window.clearTimeout(timerRef.current);
          timerRef.current = undefined;
        }
      };
    } else if (timerRef.current !== undefined) {
      // If status is not active but timer is running, clear it
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, [status, intervalSeconds, recursiveCountdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, []);

  return { countdown, resetTimer };
};
