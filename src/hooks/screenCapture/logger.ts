
// Logger spécialisé pour le hook useScreenCapture
export const createLogger = () => {
  const logDebug = (message: string) => {
    console.log(`[useScreenCapture] ${message}`);
  };

  // Combine message and error into a single string parameter
  const logError = (message: string): Error => {
    console.error(`[useScreenCapture ERROR] ${message}`);
    return new Error(message);
  };
  
  return {
    logDebug,
    logError
  };
};
