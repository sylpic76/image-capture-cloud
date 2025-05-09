
import { toast } from 'sonner';

/**
 * Check environment variables required for AI functionality
 */
export const checkRequiredEnvironmentVars = (): boolean => {
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!hasSupabaseUrl || !hasSupabaseKey) {
    console.error("Variables d'environnement manquantes:");
    console.error(`VITE_SUPABASE_URL: ${hasSupabaseUrl ? "OK" : "MANQUANTE"}`);
    console.error(`VITE_SUPABASE_ANON_KEY: ${hasSupabaseKey ? "OK" : "MANQUANTE"}`);
    
    toast.error("Configuration incomplète", {
      description: "Vérifiez les variables d'environnement dans votre fichier .env",
      duration: 7000
    });
    
    return false;
  }
  
  console.log("[Assistant] Variables d'environnement vérifiées ✓");
  return true;
};

/**
 * Get API endpoint URL with proper error handling and verification
 */
export const getApiEndpoint = (): string | null => {
  if (!checkRequiredEnvironmentVars()) {
    return null;
  }
  
  // Clean up the URL to avoid double slash issues
  const baseUrl = import.meta.env.VITE_SUPABASE_URL.endsWith('/') 
    ? import.meta.env.VITE_SUPABASE_URL.slice(0, -1) 
    : import.meta.env.VITE_SUPABASE_URL;
  
  const url = `${baseUrl}/functions/v1/anthropic-ai`;
  
  return url;
};

/**
 * Check if the Supabase service is running and accessible
 * Without using the non-existent health endpoint
 */
export const checkSupabaseStatus = async (): Promise<boolean> => {
  try {
    // Use an endpoint we know exists (functions endpoint)
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Cache-Control': 'no-cache',
      },
    });
    
    // 204 is common for OPTIONS requests
    return response.ok || response.status === 204;
  } catch (error) {
    console.error("Error checking Supabase status:", error);
    return false;
  }
};

/**
 * Test if the API endpoint is accessible
 */
export const testApiEndpoint = async (url: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    console.log(`[Assistant] Testing endpoint accessibility: ${url}`);
    
    // Perform an OPTIONS test to check if the endpoint is accessible
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      mode: 'cors'
    });
    
    console.log(`[Assistant] OPTIONS test response: ${response.status} ${response.statusText}`);
    
    if (response.ok || response.status === 204) {
      console.log('[Assistant] Endpoint accessible ✓');
    } else {
      console.error('[Assistant] Endpoint access error:', response.status, response.statusText);
    }
    
    return { 
      ok: response.ok || response.status === 204, 
      error: !response.ok ? `Status: ${response.status} ${response.statusText}` : undefined 
    };
  } catch (error) {
    console.error("[Assistant] Error testing endpoint:", error);
    return { 
      ok: false, 
      error: error.message 
    };
  }
};
