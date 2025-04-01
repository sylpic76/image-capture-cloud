
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import ChatOptions from '@/components/AssistantIA/ChatOptions';
import ChatHeader from '@/components/AssistantIA/ChatHeader';
import ChatContainer from '@/components/AssistantIA/ChatContainer';
import ChatForm from '@/components/AssistantIA/ChatForm';

const AssistantIA = () => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [useScreenshots, setUseScreenshots] = useState(true);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation
  } = useAssistantMessages(useScreenshots);

  // Fetch the latest screenshot
  const { refetch: refetchScreenshot } = useQuery({
    queryKey: ['latestScreenshot'],
    queryFn: async () => {
      if (!useScreenshots) return null;

      try {
        const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération de la capture d'écran: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Erreur de capture d\'écran:', error);
        return null;
      }
    },
    enabled: useScreenshots,
    refetchInterval: 10000, // Refresh every 10 seconds when screenshots are enabled
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="h-[80vh] flex flex-col">
        <ChatHeader 
          setIsOptionsOpen={setIsOptionsOpen}
          saveConversation={saveConversation}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
        />

        <CardContent className="flex-grow pb-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <ChatContainer 
              messages={messages}
              isLoading={isLoading}
            />

            <ChatForm 
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <ChatOptions 
        open={isOptionsOpen} 
        onOpenChange={setIsOptionsOpen}
        useScreenshots={useScreenshots}
        setUseScreenshots={setUseScreenshots}
      />
    </div>
  );
};

export default AssistantIA;
