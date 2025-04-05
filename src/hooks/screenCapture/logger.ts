
// Logger spécialisé pour le hook useScreenCapture
export const createLogger = () => {
  const logDebug = (message: string) => {
    console.log(`[useScreenCapture] ${message}`);
  };

  // Explicitly define the return type and make error optional
  const logError = (message: string, error?: any): Error => {
    console.error(`[useScreenCapture ERROR] ${message}`, error ? `:${error}` : "");
    return error instanceof Error ? error : new Error(String(error || message));
  };
  
  return {
    logDebug,
    logError
  };
};
