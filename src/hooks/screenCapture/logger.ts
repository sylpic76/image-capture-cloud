
// Logger spécialisé pour le hook useScreenCapture
export const createLogger = () => {
  const logDebug = (message: string) => {
    console.log(`[useScreenCapture] ${message}`);
  };

  const logError = (message: string, error: any) => {
    console.error(`[useScreenCapture ERROR] ${message}:`, error);
    return error instanceof Error ? error : new Error(String(error));
  };
  
  return {
    logDebug,
    logError
  };
};
