
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { useIsMobile } from "@/hooks/use-mobile";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import ChatContainer from "@/components/AssistantIA/ChatContainer";
import ChatForm from "@/components/AssistantIA/ChatForm";
import ChatHeader from "@/components/AssistantIA/ChatHeader";
import ChatOptions from "@/components/AssistantIA/ChatOptions";
import EndpointLink from "@/components/EndpointLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";

const UnifiedApp = () => {
  const isMobile = useIsMobile();
  
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
  
  // API Endpoint URLs
  const latestImageEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest";
  const screenshotsApiEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";
  
  // Copy endpoint to clipboard
  const copyEndpoint = (endpoint: string) => {
    navigator.clipboard.writeText(endpoint);
    toast.success("URL de l'endpoint copiée !");
  };

  // Open endpoint in new tab
  const openEndpoint = (endpoint: string) => {
    window.open(endpoint, '_blank');
  };
  
  // Fetch latest screenshot
  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      const response = await fetch(latestImageEndpoint, {
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
            
            {/* Latest Image Endpoint Link Card */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg">Lien direct vers la dernière image</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-2">
                  <div className="overflow-x-auto rounded border bg-muted/20 p-2">
                    <code className="text-xs md:text-sm whitespace-nowrap">
                      {latestImageEndpoint}
                    </code>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyEndpoint(latestImageEndpoint)}
                      className="flex gap-1.5"
                    >
                      <Copy size={16} />
                      <span>Copier</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openEndpoint(latestImageEndpoint)}
                      className="flex gap-1.5"
                    >
                      <ExternalLink size={16} />
                      <span>Ouvrir</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="bg-muted/30 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Dernier screenshot</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Màj: {lastRefreshTime.toLocaleTimeString()}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={fetchLatestScreenshot}
                    disabled={isImageLoading}
                  >
                    <RefreshCw size={16} className={`${isImageLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
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
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg">API REST Supabase (JSON)</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-2">
                  <div className="overflow-x-auto rounded border bg-muted/20 p-2">
                    <code className="text-xs md:text-sm whitespace-nowrap">
                      {screenshotsApiEndpoint}
                    </code>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyEndpoint(screenshotsApiEndpoint)}
                      className="flex gap-1.5"
                    >
                      <Copy size={16} />
                      <span>Copier</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openEndpoint(screenshotsApiEndpoint)}
                      className="flex gap-1.5"
                    >
                      <ExternalLink size={16} />
                      <span>Ouvrir</span>
                    </Button>
                  </div>
                </div>
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
  
  // Desktop layout with 2-column grid - 1/3 - 2/3 distribution
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-1">
        Image Capture & Assistant IA
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Screen Capture Controls (1/3 width) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <ScreenCaptureControls 
            status={status}
            countdown={countdown}
            toggleCapture={toggleCapture}
          />
          
          {/* Latest Image Endpoint Link Card */}
          <Card className="overflow-hidden border-muted/40 shadow-sm">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-lg">Lien direct vers la dernière image</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-2">
                <div className="overflow-x-auto rounded border bg-muted/20 p-2">
                  <code className="text-xs md:text-sm whitespace-nowrap">
                    {latestImageEndpoint}
                  </code>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyEndpoint(latestImageEndpoint)}
                    className="flex gap-1.5"
                  >
                    <Copy size={16} />
                    <span>Copier</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openEndpoint(latestImageEndpoint)}
                    className="flex gap-1.5"
                  >
                    <ExternalLink size={16} />
                    <span>Ouvrir</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-muted/40 shadow-sm">
            <CardHeader className="bg-muted/30 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dernier screenshot</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {lastRefreshTime.toLocaleTimeString()}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={fetchLatestScreenshot}
                  disabled={isImageLoading}
                  title="Rafraîchir"
                >
                  <RefreshCw size={16} className={`${isImageLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {latestScreenshot ? (
                <div className="border border-border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
          
          {/* API Endpoint Link */}
          <Card className="overflow-hidden border-muted/40 shadow-sm">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-lg">API REST Supabase (JSON)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-2">
                <div className="overflow-x-auto rounded border bg-muted/20 p-2">
                  <code className="text-xs md:text-sm whitespace-nowrap">
                    {screenshotsApiEndpoint}
                  </code>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyEndpoint(screenshotsApiEndpoint)}
                    className="flex gap-1.5"
                  >
                    <Copy size={16} />
                    <span>Copier</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openEndpoint(screenshotsApiEndpoint)}
                    className="flex gap-1.5"
                  >
                    <ExternalLink size={16} />
                    <span>Ouvrir</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Assistant IA (2/3 width) */}
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
