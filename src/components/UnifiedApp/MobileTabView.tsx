
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import ChatContainer from "@/components/AssistantIA/ChatContainer";
import ChatForm from "@/components/AssistantIA/ChatForm";
import ChatHeader from "@/components/AssistantIA/ChatHeader";
import EndpointLink from "@/components/EndpointLink";

interface MobileTabViewProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
  messages: any[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  saveConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  setIsOptionsOpen: (isOpen: boolean) => void;
  latestImageEndpoint: string;
  screenshotsApiEndpoint: string;
  latestScreenshot: string | null;
  lastRefreshTime: Date;
  isImageLoading: boolean;
  fetchLatestScreenshot: () => Promise<void>;
  imageProcessingStatus?: 'idle' | 'processing' | 'success' | 'error';
}

const MobileTabView = ({
  status,
  countdown,
  toggleCapture,
  messages,
  input,
  setInput,
  isLoading,
  handleSubmit,
  saveConversation,
  useScreenshots,
  setUseScreenshots,
  setIsOptionsOpen,
  latestImageEndpoint,
  screenshotsApiEndpoint,
  latestScreenshot,
  lastRefreshTime,
  isImageLoading,
  fetchLatestScreenshot,
  imageProcessingStatus = 'idle',
}: MobileTabViewProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Image Capture & Assistant IA</h1>
      
      <Tabs defaultValue="capture" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="capture">Capture d'écran</TabsTrigger>
          <TabsTrigger value="assistant">Assistant IA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="capture" className="mt-4 space-y-4">
          <ScreenCaptureControls 
            status={status}
            countdown={countdown}
            toggleCapture={toggleCapture}
          />
          
          {/* Latest Image Endpoint */}
          <EndpointLink 
            link={latestImageEndpoint}
            title="Lien direct vers la dernière image"
          />
          
          {/* Screenshot Preview */}
          <Card className="border-muted/40 shadow-sm">
            <CardContent className="pt-4">
              {latestScreenshot ? (
                <div className="border border-border rounded-md overflow-hidden shadow-sm">
                  <img 
                    src={latestScreenshot} 
                    alt="Dernière capture d'écran" 
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-border rounded-md bg-muted/30">
                  <p className="text-muted-foreground">Aucune capture disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* API Endpoint Link */}
          <EndpointLink 
            link={screenshotsApiEndpoint}
            title="API REST Supabase (JSON)"
          />
        </TabsContent>
        
        <TabsContent value="assistant" className="mt-4">
          <Card className="h-[calc(100vh-12rem)] flex flex-col">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileTabView;
