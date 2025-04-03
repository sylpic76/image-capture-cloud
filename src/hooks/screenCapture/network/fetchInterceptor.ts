
import { createLogger } from '../logger';
import { handleHttpError, handleFetchError } from './errorHandling';
import { TokenRefreshManager } from './tokenRefresh';

const { logDebug } = createLogger();

// Setup fetch interceptor to monitor network requests
export const setupFetchInterceptor = (): () => void => {
  const originalFetch = window.fetch;
  const tokenManager = new TokenRefreshManager();
  
  // Intercept all fetch requests
  window.fetch = async (...args) => {
    const url = args[0] ? String(args[0]) : '';
    const isAssistantEndpoint = url.includes('anthropic-ai');
    const isScreenshotEndpoint = url.includes('capture-screenshot') || url.includes('latest');
    
    if (isAssistantEndpoint || isScreenshotEndpoint) {
      logDebug(`Network request intercepted to: ${url}`);
      
      // Log detailed request information
      if (isAssistantEndpoint) {
        const requestInit = args[1] as RequestInit;
        const method = requestInit?.method || 'GET';
        
        // Create a sanitized copy of headers without sensitive information
        const headers = requestInit?.headers ? 
          Object.fromEntries(
            Object.entries(requestInit.headers as Record<string, string>)
              .filter(([key]) => !['Authorization', 'apikey'].includes(key))
          ) : {};
        
        logDebug(`Assistant request details: ${method} ${url}`, { 
          headers,
          bodySize: requestInit?.body ? String(requestInit.body).length : 0,
          cache: requestInit?.cache || 'default'
        });
      }
    }
    
    try {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if ((isAssistantEndpoint || isScreenshotEndpoint) && responseTime > 500) {
        logDebug(`Slow request (${responseTime}ms): ${url}`);
      }
      
      if ((isAssistantEndpoint || isScreenshotEndpoint) && !response.ok) {
        const { status, isBackground } = handleHttpError(url, response.status, response.statusText, responseTime);
        
        // If we get a 401 unauthorized, try to refresh the token
        if (status === 401 && !isBackground) {
          tokenManager.scheduleRefresh();
        }
      }
      
      return response;
    } catch (error) {
      if (isAssistantEndpoint || isScreenshotEndpoint) {
        handleFetchError(url, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  };
  
  // Return cleanup function
  return () => {
    window.fetch = originalFetch;
    tokenManager.cleanup();
    logDebug("Fetch interceptor disabled");
  };
};
