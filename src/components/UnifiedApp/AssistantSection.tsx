
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatContainer from "@/components/AssistantIA/ChatContainer";
import ChatForm from "@/components/AssistantIA/ChatForm";
import ChatHeader from "@/components/AssistantIA/ChatHeader";

interface AssistantSectionProps {
  messages: any[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  saveConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  setIsOptionsOpen: (isOpen: boolean) => void;
  imageProcessingStatus?: 'idle' | 'processing' | 'success' | 'error';
}

const AssistantSection = ({
  messages,
  input,
  setInput,
  isLoading,
  handleSubmit,
  saveConversation,
  useScreenshots,
  setUseScreenshots,
  setIsOptionsOpen,
  imageProcessingStatus = 'idle',
}: AssistantSectionProps) => {
  return (
    <div className="lg:col-span-8">
      <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-md border-muted/40">
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
              imageProcessingStatus={imageProcessingStatus}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssistantSection;
