
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
  // Vérification du projet
  if (!currentProject) {
    console.warn("Aucun projet spécifié, utilisation du projet par défaut");
    toast.info("Projet par défaut utilisé");
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

    // Tentative d'envoi du message à l'assistant
    console.log("[Assistant] Envoi du message à l'API assistant");
    const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
    
    if (aiResponseData.response) {
      console.log(`[Assistant] Réponse reçue (${aiResponseData.response.length} caractères)`);
      addAssistantMessage(aiResponseData.response);
    } else {
      console.error("[Assistant] Réponse vide ou invalide");
      throw new Error("Réponse vide ou invalide reçue de l'assistant");
    }

  } catch (error: any) {
    console.error('[Assistant] Erreur assistant:', error);
    
    // Enregistrement détaillé des erreurs
    if (error instanceof Error) {
      console.error('[Assistant] Détails:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    
    addErrorMessage(error);
    
    // Message d'erreur plus détaillé
    let errorMessage = "Erreur de communication. Réessayez dans quelques instants.";
    
    if (error.message?.includes('Failed to fetch')) {
      errorMessage = `Erreur de connexion au serveur. Vérifiez que la fonction Edge "anthropic-ai" est déployée et active.`;
      toast.error(errorMessage, {
        description: "URL: " + import.meta.env.VITE_SUPABASE_URL + "/functions/v1/anthropic-ai",
        duration: 10000,
      });
    } else if (error.message) {
      errorMessage = `Erreur: ${error.message}`;
      toast.error(errorMessage, {
        duration: 7000
      });
    }
  } finally {
    setIsLoading(false);
    setImageProcessingStatus('idle');
    console.log("[Assistant] Traitement de la requête terminé");
  }
}
