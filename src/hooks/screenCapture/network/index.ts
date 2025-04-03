
import { setupFetchInterceptor } from './fetchInterceptor';
import { setupConnectionMonitor } from './connectionMonitor';
import { setupPerformanceMonitor } from './performanceMonitor';
import { setupErrorObserver } from './errorObserver';
import { createLogger } from '../logger';

const { logDebug } = createLogger();

// Main function to setup all network monitoring features
export const setupNetworkMonitor = (): () => void => {
  logDebug("Initialisation du moniteur réseau");
  
  // Setup all monitors
  const cleanupFetch = setupFetchInterceptor();
  const cleanupConnection = setupConnectionMonitor();
  const cleanupPerformance = setupPerformanceMonitor();
  const cleanupErrorObserver = setupErrorObserver();
  
  // Return a single cleanup function that calls all cleanup functions
  return () => {
    cleanupFetch();
    cleanupConnection();
    cleanupPerformance();
    cleanupErrorObserver();
    logDebug("Moniteur réseau désactivé");
  };
};
