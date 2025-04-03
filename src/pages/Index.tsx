
import { useState } from 'react';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from '@/hooks/useConversationState';
import { toast } from 'sonner';
import { fetchLatestScreenshot } from '@/utils/screenshotUtils';
import { sendMessageToAI } from '@/utils/conversationUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

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

    addUserMessage(input);
    setInput('');
    setIsLoading(true);

    try {
      let screenshotData = null;

      if (useScreenshots) {
        setImageProcessingStatus('processing');

        try {
          screenshotData = await fetchLatestScreenshot(setImageProcessingStatus);

          if (screenshotData) {
            setImageProcessingStatus('success');
          } else {
            console.warn("Screenshot fetched but returned null or empty");
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
          setImageProcessingStatus('error');
          toast.error('Erreur lors du traitement de la capture d\'écran. L\'assistant continuera sans image.');
        }
      }

      const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
      addAssistantMessage(aiResponseData.response);

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      addErrorMessage(error);
      toast.error(`Erreur de communication avec l'assistant.`);
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
    setCurrentProject
  };
};
