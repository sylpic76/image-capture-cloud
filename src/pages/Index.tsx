
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

    console.log(`[IndexPage] Envoi de message: "${input.substring(0, 30)}..."`);
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
            console.log("[IndexPage] Capture d'écran récupérée avec succès");
            setImageProcessingStatus('success');
          } else {
            console.warn("[IndexPage] Screenshot fetched but returned null or empty");
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('[IndexPage] Error processing screenshot:', error);
          setImageProcessingStatus('error');
          toast.error('Erreur lors du traitement de la capture d\'écran. L\'assistant continuera sans image.');
        }
      }

      console.log("[IndexPage] Envoi du message à l'API assistant");
      const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
      console.log(`[IndexPage] Réponse reçue de l'assistant (${aiResponseData.response.length} caractères)`);
      addAssistantMessage(aiResponseData.response);

    } catch (error: any) {
      console.error('[IndexPage] Error in handleSubmit:', error);
      
      // Log détaillé de l'erreur
      if (error instanceof Error) {
        console.error('[IndexPage] Détails erreur:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        });
      }
      
      addErrorMessage(error);
      toast.error(`Erreur de communication avec l'assistant.`);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
      console.log("[IndexPage] Traitement du message terminé");
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

// Add a default export component that App.tsx can use
const IndexPage = () => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    saveConversation,
    clearConversation
  } = useAssistantMessages(true);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Assistant IA (Legacy Page)</h1>
      <p className="mb-4">This is the old index page. Please use the new unified app.</p>
      <a href="/" className="text-blue-500 hover:underline">Go to new app</a>
    </div>
  );
};

export default IndexPage;
