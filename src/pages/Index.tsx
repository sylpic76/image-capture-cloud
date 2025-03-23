
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import ScreenshotGallery from "@/components/ScreenshotGallery";
import SupabaseLink from "@/components/SupabaseLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";

const Index = () => {
  // Use our custom screen capture hook
  const { status, countdown, toggleCapture, lastCaptureUrl } = useScreenCapture(30);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Supabase REST API link
  const supabaseLink = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";
  
  // Direct latest screenshot link - Mise à jour du format pour V1
  const latestImageLink = "https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest";

  // Fetch screenshots from Supabase
  useEffect(() => {
    const fetchScreenshots = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('screenshot_log')
          .select('id, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('Error fetching screenshots:', error);
          toast.error('Impossible de charger les screenshots');
        } else {
          setScreenshots(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    fetchScreenshots();

    // Set up a real-time listener for changes to the screenshot_log table
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'screenshot_log'
        }, 
        (payload) => {
          // When a new screenshot is added, fetch the latest screenshots
          fetchScreenshots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const copyLatestLink = () => {
    navigator.clipboard.writeText(latestImageLink);
    toast.success("Lien direct vers la dernière image copié !");
  };

  const openLatestImage = () => {
    window.open(latestImageLink, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        {/* Header with Status and Controls */}
        <ScreenCaptureControls 
          status={status} 
          countdown={countdown} 
          toggleCapture={toggleCapture} 
        />

        {/* Direct Latest Image Link */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lien direct vers la dernière image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Ce lien redirige toujours vers la dernière capture d'écran. Idéal pour les intégrations.
              </p>
              <div className="flex gap-2">
                <input 
                  value={latestImageLink}
                  readOnly
                  className="w-full font-mono text-sm p-2 border rounded"
                />
                <Button variant="outline" onClick={copyLatestLink}>
                  <Copy size={18} />
                  <span className="ml-2 hidden md:inline">Copier</span>
                </Button>
                <Button onClick={openLatestImage}>
                  <ExternalLink size={18} />
                  <span className="ml-2 hidden md:inline">Ouvrir</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Screenshots */}
        <ScreenshotGallery 
          screenshots={screenshots} 
          loading={loading} 
        />

        {/* Supabase Link */}
        <SupabaseLink link={supabaseLink} />
      </div>
    </div>
  );
};

export default Index;
