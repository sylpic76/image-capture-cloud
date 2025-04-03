
/**
 * Utilities for building AI API requests
 */

/**
 * Create request init object for fetch
 */
export const createRequestInit = (
  input: string, 
  screenshotBase64: string | null, 
  projectName: string
): RequestInit => {
  return {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
    },
    body: JSON.stringify({
      message: input.trim(),
      screenshot: screenshotBase64,
      projectName: projectName
    }),
    cache: 'no-store'
  };
};

/**
 * Log request details without sensitive information
 */
export const logSafeRequestDetails = (
  requestInit: RequestInit, 
  input: string, 
  screenshotBase64: string | null
): void => {
  const safeHeadersLog = { ...requestInit.headers };
  delete (safeHeadersLog as any).Authorization;
  delete (safeHeadersLog as any).apikey;
  
  console.log("[Assistant] En-têtes de requête:", safeHeadersLog);
  console.log("[Assistant] Taille du payload:", 
    Math.round((requestInit.body as string).length / 1024), 
    "KB (message:", input.trim().length, "caractères",
    screenshotBase64 ? ", screenshot: ~" + Math.round(screenshotBase64.length / 1024) + "KB)" : ", pas de screenshot)");
};
