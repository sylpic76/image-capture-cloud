
import { toast } from 'sonner';
import { ImageProcessingStatus } from '@/types/assistant';
import { fetchLatestScreenshot } from './screenshotUtils';
import { sendMessageToAI } from './conversationUtils';
import { NetworkStatus } from '@/hooks/useNetworkStatus';

interface HandleMessageParams {
  input: string;
  currentProject: string;
  addUserMessage: (message: string) => void;
  addAssistantMessage: (message: string) => void;
  addErrorMessage: (error: any) => void;
  setIsLoading: (isLoading: boolean) => void;
  setImageProcessingStatus: (status: ImageProcessingStatus) => void;
  networkStatus: NetworkStatus;
  useScreenshots: boolean;
}

export async function handleMessageSubmission({
  input,
  currentProject,
  addUserMessage,
  addAssistantMessage,
  addErrorMessage,
  setIsLoading,
  setImageProcessingStatus,
  networkStatus,
  useScreenshots
}: HandleMessageParams): Promise<void> {
  // Affiche un avertissement au lieu de bloquer complètement l'envoi
  if (networkStatus === 'offline') {
    console.warn("Réseau hors ligne, tentative d'envoi quand même");
    toast.warning("Connexion instable. Tentative d'envoi quand même...");
    // On continue l'exécution au lieu de bloquer
  }

  console.log(`[Assistant] Envoi de message: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}" (réseau: ${networkStatus})`);
  addUserMessage(input);
  setIsLoading(true);

  try {
    let screenshotData: string | null = null;

    if (useScreenshots) {
      console.log("[Assistant] Tentative de récupération d'une capture d'écran");
      setImageProcessingStatus('processing');
      try {
        screenshotData = await fetchLatestScreenshot(setImageProcessingStatus);

        if (screenshotData) {
          console.log("[Assistant] Capture d'écran récupérée avec succès");
          setImageProcessingStatus('success');
        } else {
          console.warn("[Assistant] Aucune capture d'écran disponible");
          setImageProcessingStatus('error');
        }
      } catch (error) {
        console.error('[Assistant] Erreur capture écran:', error);
        setImageProcessingStatus('error');
        toast.error('Erreur capture écran. L\'assistant continue sans image.');
      }
    }

    // Vérification de la valeur des variables d'environnement (en masquant les valeurs sensibles)
    console.log("[Assistant] Vérification des variables d'environnement:");
    console.log(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? "Définie" : "Non définie"}`);
    console.log(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? "Définie (longueur: " + import.meta.env.VITE_SUPABASE_ANON_KEY.length + ")" : "Non définie"}`);

    console.log("[Assistant] Envoi du message à l'API assistant");
    // Vérifier que l'URL complète est correcte
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`;
    console.log(`[Assistant] URL de l'API: ${apiUrl}`);
    
    const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
    console.log(`[Assistant] Réponse reçue (${aiResponseData.response.length} caractères)`);
    addAssistantMessage(aiResponseData.response);

  } catch (error: any) {
    console.error('[Assistant] Erreur assistant:', error);
    
    // Enregistrement détaillé des erreurs
    if (error instanceof Error) {
      console.error('[Assistant] Détails:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
    }
    
    addErrorMessage(error);
    
    // Message d'erreur plus détaillé et sans bloquer l'utilisateur
    let errorMessage = "Erreur de communication. Réessayez dans quelques instants.";
    
    if (error.message?.includes('Failed to fetch')) {
      errorMessage = `Erreur de connexion au serveur. Vérifiez que la fonction Edge "anthropic-ai" est déployée et active.`;
      toast.error(errorMessage, {
        description: "URL: " + import.meta.env.VITE_SUPABASE_URL + "/functions/v1/anthropic-ai",
        duration: 7000,
      });
    } else if (error.message) {
      errorMessage = `Erreur: ${error.message}`;
      toast.error(errorMessage);
    }
  } finally {
    setIsLoading(false);
    setImageProcessingStatus('idle');
    console.log("[Assistant] Traitement de la requête terminé");
  }
}
