
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
