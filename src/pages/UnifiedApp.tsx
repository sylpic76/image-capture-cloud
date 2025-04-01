
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { useMobile } from "@/hooks/use-mobile";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import ChatContainer from "@/components/AssistantIA/ChatContainer";
import ChatForm from "@/components/AssistantIA/ChatForm";
import ChatHeader from "@/components/AssistantIA/ChatHeader";
import ChatOptions from "@/components/AssistantIA/ChatOptions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

const UnifiedApp = () => {
  const isMobile = useMobile();
  
  // Screen capture functionality
  const { status, countdown, toggleCapture } = useScreenCapture(10);
  
  // Assistant IA functionality
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
  
  // Latest screenshot state
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // Fetch latest screenshot
  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setLatestScreenshot(url);
        setLastRefreshTime(new Date());
      } else {
        console.error('Error fetching screenshot:', response.status);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsImageLoading(false);
    }
  };

  // Auto-refresh screenshot every 10 seconds
  useEffect(() => {
    fetchLatestScreenshot();
    
    const intervalId = setInterval(() => {
      fetchLatestScreenshot();
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Mobile layout with tabs
  if (isMobile) {
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
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium">Dernier screenshot</h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Màj: {lastRefreshTime.toLocaleTimeString()}</span>
                    <button 
                      onClick={fetchLatestScreenshot}
                      className="p-1 rounded-full hover:bg-muted"
                      disabled={isImageLoading}
                    >
                      <RefreshCw size={14} className={`${isImageLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                
                {latestScreenshot ? (
                  <div className="border border-border rounded-md overflow-hidden">
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
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <ChatOptions 
          open={isOptionsOpen} 
          onOpenChange={setIsOptionsOpen}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
        />
      </div>
    );
  }
  
  // Desktop layout with 2-column grid
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-8">Image Capture & Assistant IA</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Screen Capture Controls */}
        <div className="flex flex-col gap-6">
          <ScreenCaptureControls 
            status={status}
            countdown={countdown}
            toggleCapture={toggleCapture}
          />
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Dernier screenshot</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Mise à jour: {lastRefreshTime.toLocaleTimeString()}
                  </Badge>
                  <button 
                    onClick={fetchLatestScreenshot}
                    className="p-1 rounded-full hover:bg-muted"
                    disabled={isImageLoading}
                  >
                    <RefreshCw 
                      size={16} 
                      className={`${isImageLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {latestScreenshot ? (
                <div className="border border-border rounded-md overflow-hidden">
                  <img 
                    src={latestScreenshot} 
                    alt="Dernière capture d'écran" 
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-border rounded-md bg-muted/30">
                  <p className="text-muted-foreground">Aucune capture d'écran disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Assistant IA */}
        <div>
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
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ChatOptions 
        open={isOptionsOpen} 
        onOpenChange={setIsOptionsOpen}
        useScreenshots={useScreenshots}
        setUseScreenshots={setUseScreenshots}
      />
    </div>
  );
};

export default UnifiedApp;
