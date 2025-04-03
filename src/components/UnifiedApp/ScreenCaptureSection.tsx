
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import EndpointLink from "@/components/EndpointLink";
import { supabase } from "@/integrations/supabase/client";

interface ScreenCaptureSectionProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
  getDiagnostics?: () => any;
  sdkDisabled?: boolean;
}

const ScreenCaptureSection = ({ 
  status, 
  countdown, 
  toggleCapture,
  getDiagnostics,
  sdkDisabled
}: ScreenCaptureSectionProps) => {
  // Latest screenshot state
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // API Endpoint URLs
  const lastCaptureEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/last-capture`;
  const screenshotsApiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10`;

  // Fetch latest screenshot
  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      
      // Add cache-busting parameter
      const cacheBuster = `?t=${Date.now()}`;
      
      const response = await fetch(`${lastCaptureEndpoint}${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching screenshot URL:', response.status, errorText);
        toast.error(`Erreur lors de la récupération de l'URL: ${response.status}`);
        setIsImageLoading(false);
        return;
      }

      const data = await response.json();
      
      if (!data.url) {
        console.error('Invalid response from server:', data);
        toast.error("Format de réponse invalide");
        setIsImageLoading(false);
        return;
      }
      
      // Revoke old URL to prevent memory leaks
      if (latestScreenshot) {
        URL.revokeObjectURL(latestScreenshot);
      }
      
      // Now fetch the actual image using the signed URL
      const imageResponse = await fetch(data.url, {
        cache: 'no-store'
      });
      
      if (!imageResponse.ok) {
        console.error('Error fetching image with signed URL:', imageResponse.status);
        toast.error(`Erreur lors de la récupération de l'image: ${imageResponse.status}`);
        setIsImageLoading(false);
        return;
      }
      
      const blob = await imageResponse.blob();
      const url = URL.createObjectURL(blob);
      setLatestScreenshot(url);
      setLastRefreshTime(new Date());
      // Suppression du toast de succès qui s'affiche régulièrement
    } catch (error) {
      console.error('Error:', error);
      toast.error("Impossible de récupérer la dernière capture d'écran");
    } finally {
      setIsImageLoading(false);
    }
  };

  // Auto-refresh screenshot every 5 seconds
  useEffect(() => {
    fetchLatestScreenshot();
    
    const intervalId = setInterval(() => {
      fetchLatestScreenshot();
    }, 5000); // Set to 5000ms (5 seconds)
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="lg:col-span-4 flex flex-col gap-4">
      <ScreenCaptureControls 
        status={status}
        countdown={countdown}
        toggleCapture={toggleCapture}
        getDiagnostics={getDiagnostics}
        sdkDisabled={sdkDisabled}
      />
      
      {/* Latest Image Endpoint */}
      <EndpointLink 
        link={lastCaptureEndpoint}
        title="API pour la dernière capture (URL signée)"
      />
      
      {/* Screenshot Preview Card */}
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
                loading="eager"
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
      <EndpointLink 
        link={screenshotsApiEndpoint}
        title="API REST Supabase (JSON)"
      />
    </div>
  );
};

export default ScreenCaptureSection;
