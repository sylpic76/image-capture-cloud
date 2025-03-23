
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

const Index = () => {
  // State for tracking active status and countdown
  const [isActive, setIsActive] = useState(true);
  const [countdown, setCountdown] = useState(30);
  
  // Mock data for screenshots (in a real app, this would come from Supabase)
  const [screenshots, setScreenshots] = useState([
    { id: 1, url: "https://picsum.photos/800/600?random=1", created_at: new Date().toISOString() },
    { id: 2, url: "https://picsum.photos/800/600?random=2", created_at: new Date().toISOString() },
    { id: 3, url: "https://picsum.photos/800/600?random=3", created_at: new Date().toISOString() },
    { id: 4, url: "https://picsum.photos/800/600?random=4", created_at: new Date().toISOString() },
    { id: 5, url: "https://picsum.photos/800/600?random=5", created_at: new Date().toISOString() },
  ]);
  
  // Supabase REST API link
  const supabaseLink = "https://mvuccsplodgeomzqnwjs.supabase.co/rest/v1/screenshot_log?select=image_url,created_at&order=created_at.desc&limit=10";

  // Toggle active/paused state
  const toggleActive = () => {
    setIsActive(!isActive);
    toast.success(isActive ? "Screenshot capture paused" : "Screenshot capture resumed");
  };

  // Copy Supabase link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(supabaseLink);
    toast.success("Link copied to clipboard!");
  };

  // Countdown timer effect
  useEffect(() => {
    let interval;
    
    if (isActive) {
      interval = setInterval(() => {
        setCountdown((prevCount) => {
          if (prevCount <= 1) {
            // Simulate a new screenshot being taken
            const newScreenshot = {
              id: Date.now(),
              url: `https://picsum.photos/800/600?random=${Date.now()}`,
              created_at: new Date().toISOString()
            };
            
            setScreenshots(prev => [newScreenshot, ...prev].slice(0, 10));
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
                {isActive ? "Pause Capture" : "Resume Capture"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-muted-foreground" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    Next screenshot in: <span className="font-bold">{countdown}s</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {isActive ? "Capturing active" : "Capture paused"}
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
              Recent Screenshots
            </CardTitle>
          </CardHeader>
          <CardContent>
            {screenshots.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {screenshots.map((screenshot) => (
                  <Sheet key={screenshot.id}>
                    <SheetTrigger asChild>
                      <div className="relative overflow-hidden rounded-md border border-border h-32 bg-muted/30 cursor-pointer hover:opacity-90 transition-opacity">
                        <img 
                          src={screenshot.url}
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
                          Screenshot from {new Date(screenshot.created_at).toLocaleString()}
                        </h3>
                        <div className="flex-1 relative overflow-auto">
                          <img 
                            src={screenshot.url}
                            alt="Screenshot fullsize"
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
                No screenshots yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supabase Link */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Supabase JSON Link</CardTitle>
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
                <span className="ml-2 hidden md:inline">Copy Link</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
