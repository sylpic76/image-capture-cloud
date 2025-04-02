
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
  clearConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  setIsOptionsOpen: (isOpen: boolean) => void;
  imageProcessingStatus?: 'idle' | 'processing' | 'success' | 'error';
  currentProject?: string;
  setCurrentProject?: (project: string) => void;
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
  setCurrentProject
}: AssistantSectionProps) => {
  return (
    <div className="lg:col-span-8">
      <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-md border-muted/40">
        <ChatHeader
          setIsOptionsOpen={setIsOptionsOpen}
          saveConversation={saveConversation}
          clearConversation={clearConversation}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
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
