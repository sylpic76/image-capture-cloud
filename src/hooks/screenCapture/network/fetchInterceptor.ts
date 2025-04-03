
import { handleFetchError, handleHttpError } from './errorHandling';
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

// Fetch interceptor to monitor network requests
export const setupFetchInterceptor = (): () => void => {
  const originalFetch = window.fetch;
  
  window.fetch = async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';
    const requestInit = init || {};
    const startTime = performance.now();
    
    // Extract relevant info
    const endpoint = url.split('?')[0];
    
    // Special handling for anthropic-ai endpoint
    const isAiApi = endpoint.includes('anthropic-ai');
    const isCapture = endpoint.includes('capture-screenshot') || endpoint.includes('last-capture');
    
    // Debug output for AI requests
    if (isAiApi) {
      logDebug(`AI request: ${method} ${url.substring(0, 100)}...`);
    }
    
    // Log capture-related calls
    if (isCapture) {
      // Clean printed headers to avoid leaking credentials to logs
      if (requestInit.headers) {
        const headers = requestInit.headers instanceof Headers ? 
          Object.fromEntries(
            [...requestInit.headers.entries()]
              .filter(([key]) => !['Authorization', 'apikey'].includes(key))
          ) : {};
        
        logDebug(`Assistant request details: ${method} ${url}`);
      }
    }
    
    try {
      const response = await originalFetch(input, init);
      const responseTime = performance.now() - startTime;
      
      // Check for HTTP status errors
      if (!response.ok) {
        handleHttpError(url, response.status, response.statusText, responseTime);
      }
      
      return response;
    } catch (error) {
      // Handle network errors
      handleFetchError(url, error as Error);
      throw error;
    }
  };
  
  // Return cleanup function
  return () => {
    window.fetch = originalFetch;
    logDebug("Fetch interceptor disabled");
  };
};
