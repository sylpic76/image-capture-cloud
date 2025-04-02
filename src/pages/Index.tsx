
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  // Use our custom screen capture hook with 10 second interval
  const { status, countdown, toggleCapture } = useScreenCapture(10);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Updated API endpoints
  const supabaseLink = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10`;
  const lastCaptureEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/last-capture`;
  
  // State to store the latest signed URL
  const [latestSignedUrl, setLatestSignedUrl] = useState<string | null>(null);

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
          // Also update the latest signed URL
          fetchLatestSignedUrl();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch the latest signed URL
  const fetchLatestSignedUrl = async () => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`${lastCaptureEndpoint}?t=${cacheBuster}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store',
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          setLatestSignedUrl(data.url);
        }
      } else {
        console.error("Failed to fetch signed URL:", response.status);
      }
    } catch (error) {
      console.error("Error fetching signed URL:", error);
    }
  };

  // Fetch signed URL on component mount
  useEffect(() => {
    fetchLatestSignedUrl();
  }, []);

  const copyLatestLink = () => {
    if (latestSignedUrl) {
      navigator.clipboard.writeText(latestSignedUrl);
      toast.success("Lien vers la dernière image copié !");
    } else {
      toast.error("URL non disponible");
    }
  };

  const openLatestImage = () => {
    if (latestSignedUrl) {
      window.open(latestSignedUrl, '_blank');
    } else {
      toast.error("URL non disponible");
      // Try to refresh the URL
      fetchLatestSignedUrl();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Image Capture Cloud</h1>
          <div>
            <Button asChild variant="outline">
              <Link to="/assistant-ia">Assistant IA</Link>
            </Button>
          </div>
        </div>

        {/* Header with Status and Controls */}
        <ScreenCaptureControls 
          status={status} 
          countdown={countdown} 
          toggleCapture={toggleCapture} 
        />

        {/* Direct Latest Image Link */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lien vers la dernière image (URL signée)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Ce lien signé donne accès à la dernière capture d'écran. Il expire au bout d'une heure.
              </p>
              <div className="flex gap-2">
                <input 
                  value={latestSignedUrl || 'Chargement de l\'URL...'}
                  readOnly
                  className="w-full font-mono text-sm p-2 border rounded"
                />
                <Button variant="outline" onClick={copyLatestLink} disabled={!latestSignedUrl}>
                  <Copy size={18} />
                  <span className="ml-2 hidden md:inline">Copier</span>
                </Button>
                <Button onClick={openLatestImage} disabled={!latestSignedUrl}>
                  <ExternalLink size={18} />
                  <span className="ml-2 hidden md:inline">Ouvrir</span>
                </Button>
              </div>
              <div className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchLatestSignedUrl}
                >
                  Actualiser l'URL
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
