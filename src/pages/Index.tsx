
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Copy, Pause, Play, Clock, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  // State for tracking active status and countdown
  const [isActive, setIsActive] = useState(true);
  const [countdown, setCountdown] = useState(30);
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

  // Toggle active/paused state
  const toggleActive = () => {
    setIsActive(!isActive);
    toast.success(isActive ? "Capture d'écran mise en pause" : "Capture d'écran reprise");
  };

  // Copy Supabase link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(supabaseLink);
    toast.success("Lien copié dans le presse-papiers !");
  };

  // Countdown timer effect
  useEffect(() => {
    let interval;
    
    if (isActive) {
      interval = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            // In real implementation, this would trigger a screenshot
            // For now we'll just reset the timer
            return 30;
          }
          return prevCount - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col gap-8">
        {/* Header with Status and Controls */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center justify-between">
              <span>LiveScreenUploader</span>
              <Button 
                variant={isActive ? "destructive" : "default"}
                onClick={toggleActive}
                className="flex items-center gap-2"
              >
                {isActive ? <Pause size={18} /> : <Play size={18} />}
                {isActive ? "Pause la capture" : "Reprendre la capture"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-muted-foreground" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    Prochain screenshot dans: <span className="font-bold">{countdown}s</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {isActive ? "Capture active" : "Capture en pause"}
                  </span>
                </div>
                <Progress value={(countdown / 30) * 100} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Screenshots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <ImageIcon size={20} />
              Screenshots Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                Chargement des screenshots...
              </div>
            ) : screenshots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {screenshots.map((screenshot) => (
                  <Sheet key={screenshot.id}>
                    <SheetTrigger asChild>
                      <div className="relative overflow-hidden rounded-md border border-border h-32 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity">
                        <img 
                          src={screenshot.image_url}
                          alt="Screenshot"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                          {new Date(screenshot.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] sm:max-w-full">
                      <div className="h-full flex flex-col gap-4">
                        <h3 className="text-lg font-medium">
                          Screenshot du {new Date(screenshot.created_at).toLocaleString()}
                        </h3>
                        <div className="flex-1 relative overflow-auto">
                          <img 
                            src={screenshot.image_url}
                            alt="Screenshot complet"
                            className="w-full h-auto object-contain max-h-[calc(80vh-6rem)]"
                          />
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                Aucun screenshot disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supabase Link */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lien JSON Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                value={supabaseLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={copyLink}>
                <Copy size={18} />
                <span className="ml-2 hidden md:inline">Copier</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
