
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatHeader from "@/components/AssistantIA/ChatHeader";
import ChatContainer from "@/components/AssistantIA/ChatContainer";
import ChatForm from "@/components/AssistantIA/ChatForm";
import { ImageProcessingStatus } from "@/types/assistant";

interface AssistantSectionProps {
  messages: any[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  saveConversation: () => void;
  clearConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  setIsOptionsOpen: (isOpen: boolean) => void;
  imageProcessingStatus?: ImageProcessingStatus;
  currentProject?: string;
  setCurrentProject?: (project: string) => void;
  networkStatus?: 'online' | 'offline' | 'uncertain';
}

const AssistantSection = ({
  messages,
  input,
  setInput,
  isLoading,
  handleSubmit,
  saveConversation,
  clearConversation,
  useScreenshots,
  setUseScreenshots,
  setIsOptionsOpen,
  imageProcessingStatus = 'idle',
  currentProject,
  setCurrentProject,
  networkStatus
}: AssistantSectionProps) => {
  return (
    <div className="lg:col-span-8 h-[calc(100vh-10rem)]">
      <Card className="border border-muted/40 h-full flex flex-col">
        <ChatHeader
          setIsOptionsOpen={setIsOptionsOpen}
          saveConversation={saveConversation}
          clearConversation={clearConversation}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
          networkStatus={networkStatus}
        />
        
        <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AssistantSection;
