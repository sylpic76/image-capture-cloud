
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
 * Get API endpoint URL with proper error handling
 */
export const getApiEndpoint = (): string | null => {
  if (!checkRequiredEnvironmentVars()) {
    return null;
  }
  
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`;
};
