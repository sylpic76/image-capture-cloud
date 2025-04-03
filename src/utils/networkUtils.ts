
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
  
  return true;
};

/**
 * Get API endpoint URL with proper error handling and verification
 */
export const getApiEndpoint = (): string | null => {
  if (!checkRequiredEnvironmentVars()) {
    return null;
  }
  
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`;
  
  // Log the full URL to help with debugging
  console.log(`[Assistant] URL API complète: ${url}`);
  
  return url;
};

/**
 * Test if the API endpoint is accessible
 */
export const testApiEndpoint = async (url: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    // Effectuer un test OPTIONS pour voir si l'endpoint est accessible
    const response = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      mode: 'cors'
    });
    
    return { 
      ok: response.ok || response.status === 204, 
      error: !response.ok ? `Status: ${response.status}` : undefined 
    };
  } catch (error) {
    console.error("[Assistant] Erreur lors du test de l'endpoint:", error);
    return { 
      ok: false, 
      error: error.message 
    };
  }
};
