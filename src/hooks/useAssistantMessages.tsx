
import { useState } from 'react';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';
import { fetchLatestScreenshot } from '@/utils/screenshotUtils';
import { sendMessageToAI } from '@/utils/conversationUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  const networkStatus = useNetworkStatus();

  const {
    messages,
    input,
    setInput,
    currentProject,
    setCurrentProject,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    saveConversation,
    clearConversation
  } = useConversationState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Vérifier le statut du réseau avant d'envoyer
    if (networkStatus === 'offline') {
      console.warn("Network is offline, cannot send message");
      toast.error("Vous êtes hors ligne. Impossible d'envoyer le message à l'assistant.");
      return;
    }

    console.log(`[Assistant] Envoi de message: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}" (réseau: ${networkStatus})`);
    addUserMessage(input);
    setInput('');
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

      console.log("[Assistant] Envoi du message à l'API assistant");
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
      
      // Message d'erreur plus détaillé
      let errorMessage = "Erreur assistant.";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = `Erreur de connexion avec le serveur. Vérifiez votre connexion internet (Statut réseau: ${networkStatus}).`;
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
      console.log("[Assistant] Traitement de la requête terminé");
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    clearConversation,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    networkStatus
  };
};
