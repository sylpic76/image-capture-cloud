
import { toast } from 'sonner';

/**
 * Export a project by ID as Markdown
 */
export const exportProjectAsMarkdown = async (projectId: string): Promise<string | null> => {
  if (!projectId) {
    toast.error("ID de projet requis pour l'export");
    return null;
  }
  
  try {
    console.log(`Exporting project with ID: ${projectId}`);
    
    // Add retry mechanism for more resilience
    let retries = 3;
    let response;
    
    while (retries > 0) {
      try {
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-project?id=${projectId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store',
        });
        
        // If successful, break out of retry loop
        if (response.ok) break;
        
        // If we get a 5xx error, retry
        if (response.status >= 500) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
          console.log(`Retrying export... (${retries} attempts left)`);
          continue;
        }
        
        // For other errors, don't retry
        break;
      } catch (error) {
        // Network errors should be retried
        console.error('Network error during export fetch:', error);
        retries--;
        
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Retrying after network error... (${retries} attempts left)`);
      }
    }
    
    if (!response || !response.ok) {
      const errorData = await response?.json().catch(() => null);
      throw new Error(`Erreur ${response?.status}: ${errorData?.error || 'Erreur inconnue'}`);
    }
    
    const data = await response.json();
    toast.success("Export du projet réussi !");
    return data.markdown;
  } catch (error) {
    console.error('Error exporting project:', error);
    toast.error(`Échec de l'export: ${error.message}`);
    return null;
  }
};

/**
 * Download a Markdown string as a .md file
 */
export const downloadMarkdown = (markdown: string, filename: string = "project-export") => {
  if (!markdown) {
    toast.error("Aucun contenu à télécharger");
    return;
  }
  
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  toast.success("Fichier téléchargé avec succès");
};

/**
 * Helper function to check network connectivity
 */
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // Use a small request to check if we can reach the Supabase API
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/health?select=status`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      cache: 'no-store',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
};
