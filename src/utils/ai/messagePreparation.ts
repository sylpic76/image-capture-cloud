
import { toast } from 'sonner';

interface RequestPreparationResult {
  valid: boolean;
  errorMessage?: string;
}

/**
 * Prepare and validate a message request to the AI
 */
export const prepareMessageRequest = async (
  input: string,
  screenshotBase64: string | null,
  projectName: string
): Promise<RequestPreparationResult> => {
  console.log(`[Assistant] Envoi vers API: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`);
  console.log(`[Assistant] Données: screenshot=${screenshotBase64 ? "oui" : "non"}, projet="${projectName}"`);
  
  // Test de connectivité plus fiable
  try {
    const online = navigator.onLine;
    console.log(`[Assistant] État réseau (navigator.onLine): ${online ? "En ligne" : "Hors ligne"}`);
    
    if (!online) {
      toast.error("Pas de connexion Internet", {
        description: "Vérifiez votre connexion et réessayez"
      });
      return { 
        valid: false, 
        errorMessage: "Erreur: Pas de connexion Internet. Veuillez vérifier votre connectivité et réessayer."
      };
    }
    
    // Test supplémentaire avec un ping léger
    try {
      const pingResult = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/ping`, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      console.log(`[Assistant] Ping Supabase: OK`);
    } catch (pingError) {
      console.warn("[Assistant] Ping échoué, mais on continue:", pingError);
      // On continue quand même car le ping peut échouer pour d'autres raisons (CORS)
    }
  } catch (e) {
    console.warn("[Assistant] Impossible de vérifier l'état du réseau:", e);
    // Continue despite network check error
  }
  
  // Vérification des variables d'environnement (sans afficher de valeurs sensibles)
  console.log("[Assistant] Vérification des variables d'environnement:");
  console.log(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? "Définie" : "Non définie"}`);
  console.log(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 
    "Définie (longueur: " + import.meta.env.VITE_SUPABASE_ANON_KEY.length + ")" : "Non définie"}`);
  
  return { valid: true };
};
