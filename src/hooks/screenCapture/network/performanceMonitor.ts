
import { createLogger } from '../logger';

const { logDebug } = createLogger();

// Setup performance monitoring for fetch requests
export const setupPerformanceMonitor = (): () => void => {
  let observer: PerformanceObserver | null = null;
  
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'fetch' && 
            (entry.name.includes('anthropic-ai') || entry.name.includes('capture-screenshot'))) {
          const duration = entry.duration;
          if (duration > 3000) { // If more than 3 seconds
            logDebug(`⚠️ Performance lente détectée: ${entry.name} (${Math.round(duration)}ms)`);
          }
        }
      }
    });
    
    observer.observe({ type: 'resource', buffered: true });
  } catch (e) {
    logDebug("PerformanceObserver non supporté");
  }
  
  // Return cleanup function
  return () => {
    if (observer) {
      try {
        observer.disconnect();
      } catch (e) {
        // Ignore errors during disconnection
      }
    }
    logDebug("Moniteur de performance désactivé");
  };
};
