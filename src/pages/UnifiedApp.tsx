
import React, { useState } from 'react';
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useAssistantMessages } from '@/hooks/useAssistantMessages';
import { useIsMobile } from "@/hooks/use-mobile";
import ChatOptions from "@/components/AssistantIA/ChatOptions";
import ScreenCaptureSection from "@/components/UnifiedApp/ScreenCaptureSection";
import AssistantSection from "@/components/UnifiedApp/AssistantSection";
import MobileTabView from "@/components/UnifiedApp/MobileTabView";

const UnifiedApp = () => {
  const isMobile = useIsMobile();

  // Screen capture config - changed from 10 to 1 second
  const captureInterval = 1;

  const {
    status,
    countdown,
    toggleCapture,
    getDiagnostics,
    sdkDisabled
  } = useScreenCapture(captureInterval, {
    interval: captureInterval,
    autoStart: false
  });

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [useScreenshots, setUseScreenshots] = useState(true);

  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    loadConversation,
    clearConversation,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    networkStatus
  } = useAssistantMessages(useScreenshots);

  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isImageLoading, setIsImageLoading] = useState(false);

  const lastCaptureEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/last-capture`;
  const screenshotsApiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10`;

  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`${lastCaptureEndpoint}${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });

      const data = await response.json();
      if (data?.url) {
        const imageResponse = await fetch(data.url, { cache: 'no-store' });
        const blob = await imageResponse.blob();
        const url = URL.createObjectURL(blob);
        if (latestScreenshot) URL.revokeObjectURL(latestScreenshot);
        setLatestScreenshot(url);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error("Erreur screenshot:", error);
    } finally {
      setIsImageLoading(false);
    }
  };

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
        latestImageEndpoint={lastCaptureEndpoint}
        screenshotsApiEndpoint={screenshotsApiEndpoint}
        latestScreenshot={latestScreenshot}
        lastRefreshTime={lastRefreshTime}
        isImageLoading={isImageLoading}
        fetchLatestScreenshot={fetchLatestScreenshot}
        imageProcessingStatus={imageProcessingStatus}
        getDiagnostics={getDiagnostics}
        sdkDisabled={sdkDisabled}
        currentProject={currentProject}
        setCurrentProject={setCurrentProject}
        networkStatus={networkStatus}
        loadConversation={loadConversation}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-1">
        Image Capture & Assistant IA
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ScreenCaptureSection 
          status={status}
          countdown={countdown}
          toggleCapture={toggleCapture}
          getDiagnostics={getDiagnostics}
          sdkDisabled={sdkDisabled}
        />

        <AssistantSection 
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleSubmit={handleSubmit}
          saveConversation={saveConversation}
          clearConversation={clearConversation}
          loadConversation={loadConversation}
          useScreenshots={useScreenshots}
          setUseScreenshots={setUseScreenshots}
          setIsOptionsOpen={setIsOptionsOpen}
          imageProcessingStatus={imageProcessingStatus}
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
          networkStatus={networkStatus}
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
