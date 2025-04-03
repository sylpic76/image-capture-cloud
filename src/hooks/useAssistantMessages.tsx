
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

  /**
   * Handle form submission to send a message to the assistant
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // ✅ Vérification compatible avec types ("online" ou "uncertain")
    if (networkStatus !== 'online') {
      toast.error("Connexion instable ou hors-ligne. Impossible de communiquer avec l'assistant.");
      return;
    }

    addUserMessage(input);
    setInput('');
    setIsLoading(true);

    try {
      let screenshotData: string | null = null;

      if (useScreenshots) {
        setImageProcessingStatus('processing');
        try {
          screenshotData = await fetchLatestScreenshot(setImageProcessingStatus);

          if (screenshotData) {
            setImageProcessingStatus('success');
          } else {
            console.warn("Screenshot fetched but empty.");
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('Erreur screenshot:', error);
          setImageProcessingStatus('error');
          toast.error('Erreur capture écran. L\'assistant continue sans image.');
        }
      }

      const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
      addAssistantMessage(aiResponseData.response);

    } catch (error: any) {
      console.error('Erreur assistant:', error);
      addErrorMessage(error);

      // ✅ Pas de comparaison directe avec "offline" si ce type n’existe pas
      const message = networkStatus !== 'online'
        ? 'Vérifiez votre connexion internet.'
        : '';

      toast.error(`Erreur assistant. ${message}`);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
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
