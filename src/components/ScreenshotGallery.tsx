
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  image_url: string;
  created_at: string;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  loading: boolean;
}

const ScreenshotGallery = ({ screenshots, loading }: ScreenshotGalleryProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  
  // Fonction pour ajouter un timestamp aux URLs d'images pour éviter le cache
  const addCacheBuster = (url: string) => {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${imageTimestamp}`;
  };
  
  // Fonction pour rafraîchir manuellement les images
  const refreshImages = () => {
    setRefreshing(true);
    setImageTimestamp(Date.now());
    setTimeout(() => setRefreshing(false), 1000);
    toast.success("Images rafraîchies");
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-xl flex items-center gap-2">
          <ImageIcon size={20} />
          Screenshots Récents
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshImages} 
          disabled={refreshing}
          title="Rafraîchir les images"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : screenshots.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {screenshots.map((screenshot) => (
              <Sheet key={screenshot.id}>
                <SheetTrigger asChild>
                  <div className="relative overflow-hidden rounded-md border border-border h-32 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity">
                    <img 
                      src={addCacheBuster(screenshot.image_url)}
                      alt="Screenshot"
                      className="w-full h-full object-cover"
                      loading="eager"
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
                        src={addCacheBuster(screenshot.image_url)}
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
  );
};

export default ScreenshotGallery;
