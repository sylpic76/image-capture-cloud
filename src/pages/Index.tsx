
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import ScreenCaptureControls from "@/components/ScreenCaptureControls";
import ScreenshotGallery from "@/components/ScreenshotGallery";
import SupabaseLink from "@/components/SupabaseLink";

const Index = () => {
  // Use our custom screen capture hook
  const { status, countdown, toggleCapture, lastCaptureUrl } = useScreenCapture(30);
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Supabase REST API link
  const supabaseLink = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        {/* Header with Status and Controls */}
        <ScreenCaptureControls 
          status={status} 
          countdown={countdown} 
          toggleCapture={toggleCapture} 
        />

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
