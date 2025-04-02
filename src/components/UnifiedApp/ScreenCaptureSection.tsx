
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import EndpointLink from "@/components/EndpointLink";

interface ScreenCaptureSectionProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
}

const ScreenCaptureSection = ({ 
  status, 
  countdown, 
  toggleCapture 
}: ScreenCaptureSectionProps) => {
  // Latest screenshot state
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  // API Endpoint URLs
  const latestImageEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest";
  const screenshotsApiEndpoint = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";

  // Fetch latest screenshot
  const fetchLatestScreenshot = async () => {
    try {
      setIsImageLoading(true);
      
      // Add cache-busting query parameter to prevent browser caching
      const cacheBuster = `?t=${Date.now()}`;
      
      const response = await fetch(`${latestImageEndpoint}${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });

      if (response.ok) {
        // Revoke old URL to prevent memory leaks
        if (latestScreenshot) {
          URL.revokeObjectURL(latestScreenshot);
        }
        
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

  // Auto-refresh screenshot every 5 seconds
  useEffect(() => {
    fetchLatestScreenshot();
    
    const intervalId = setInterval(() => {
      fetchLatestScreenshot();
    }, 5000); // Changed from 10000 to 5000
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="lg:col-span-4 flex flex-col gap-4">
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
      
      {/* API Endpoint for JSON */}
      <EndpointLink 
        link={screenshotsApiEndpoint}
        title="API REST Supabase (JSON)"
      />
    </div>
  );
};

export default ScreenCaptureSection;
