
import { createLogger } from '../logger';

const { logError } = createLogger();

// Setup global error handler
export const setupErrorObserver = (): () => void => {
  const originalOnError = window.onerror;
  
  // Intercept unhandled errors
  window.onerror = (message, source, line, column, error) => {
    if (source && (source.includes('anthropic-ai') || source.includes('capture-screenshot') || source.includes('screenCapture'))) {
      logError(`Erreur non gérée: ${message}`, { source, line, column, error });
    }
    return originalOnError ? originalOnError(message, source, line, column, error) : false;
  };
  
  // Return cleanup function
  return () => {
    window.onerror = originalOnError;
    logDebug("Observateur d'erreurs désactivé");
  };
};

// Helper function to create logger for this module
function logDebug(message: string): void {
  console.log(`[ErrorObserver] ${message}`);
}
