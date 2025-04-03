
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
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-project?id=${projectId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Erreur ${response.status}: ${errorData?.error || 'Erreur inconnue'}`);
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
