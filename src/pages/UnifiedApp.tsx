
import React, { useState, useEffect } from 'react';
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { useIsMobile } from "@/hooks/use-mobile";
import ChatOptions from "@/components/AssistantIA/ChatOptions";
import ScreenCaptureSection from "@/components/UnifiedApp/ScreenCaptureSection";
import AssistantSection from "@/components/UnifiedApp/AssistantSection";
import MobileTabView from "@/components/UnifiedApp/MobileTabView";

const UnifiedApp = () => {
  const isMobile = useIsMobile();
  
  // Screen capture functionality - sans configuration restrictive
  const { status, countdown, toggleCapture, startCapture, getDiagnostics, sdkDisabled } = useScreenCapture(5);
  
  // Assistant IA functionality
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [useScreenshots, setUseScreenshots] = useState(true);
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    clearConversation,
    imageProcessingStatus
  } = useAssistantMessages(useScreenshots);
  
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // API Endpoint URLs
  const latestImageEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest";
  const screenshotsApiEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";
  
  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      
      // Add cache-busting parameter
      const cacheBuster = `?t=${Date.now()}`;
      
      const response = await fetch(`${latestImageEndpoint}${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
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

  // Automatically start capture when component mounts
  useEffect(() => {
    const initCapture = async () => {
      console.log("Initializing screen capture automatically");
      await startCapture();
    };
    
    initCapture();
    
    // Cleanup on unmount is handled within useScreenCapture
  }, [startCapture]); 
  
  if (isMobile) {
    return (
      <MobileTabView 
        status={status}
        countdown={countdown}
        toggleCapture={toggleCapture}
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        handleSubmit={handleSubmit}
        saveConversation={saveConversation}
        clearConversation={clearConversation}
        useScreenshots={useScreenshots}
        setUseScreenshots={setUseScreenshots}
        setIsOptionsOpen={setIsOptionsOpen}
        latestImageEndpoint={latestImageEndpoint}
        screenshotsApiEndpoint={screenshotsApiEndpoint}
        latestScreenshot={latestScreenshot}
        lastRefreshTime={lastRefreshTime}
        isImageLoading={isImageLoading}
        fetchLatestScreenshot={fetchLatestScreenshot}
        imageProcessingStatus={imageProcessingStatus}
        getDiagnostics={getDiagnostics}
        sdkDisabled={sdkDisabled}
      />
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-1">
        Image Capture & Assistant IA
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Screen Capture Controls (1/3 width) */}
        <ScreenCaptureSection 
          status={status}
          countdown={countdown}
          toggleCapture={toggleCapture}
          getDiagnostics={getDiagnostics}
          sdkDisabled={sdkDisabled}
        />
        
        {/* Right column - Assistant IA (2/3 width) */}
        <AssistantSection 
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleSubmit={handleSubmit}
          saveConversation={saveConversation}
          clearConversation={clearConversation}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
          setIsOptionsOpen={setIsOptionsOpen}
          imageProcessingStatus={imageProcessingStatus}
        />
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
