
import { createLogger } from '../logger';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

const { logDebug, logError } = createLogger();

// Helper function to try refreshing the session token
export const tryRefreshToken = async (): Promise<boolean> => {
  try {
    logDebug("Tentative de rafraîchissement du token...");
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      logError("Échec du rafraîchissement du token", error);
    } else if (data?.session) {
      logDebug("Token rafraîchi avec succès");
      toast.success("Authentification renouvelée");
      return true;
    }
  } catch (err) {
    logError("Erreur lors du rafraîchissement du token", err);
  }
  return false;
};

// Token refresh manager to prevent multiple simultaneous refresh attempts
export class TokenRefreshManager {
  private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  // Schedule token refresh with debounce
  scheduleRefresh(): void {
    if (this.refreshTimeoutId) return;
    
    this.refreshTimeoutId = setTimeout(async () => {
      await tryRefreshToken();
      this.refreshTimeoutId = null;
    }, 1000); // Small delay to avoid multiple refreshes
  }
  
  // Clean up any pending refresh
  cleanup(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }
}
