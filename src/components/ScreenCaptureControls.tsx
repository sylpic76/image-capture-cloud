
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Pause, Play, AlertTriangle, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScreenCaptureControlsProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
}

interface LogEntry {
  message: string;
  timestamp: string;
  type: 'info' | 'error' | 'success';
}

const ScreenCaptureControls = ({ status, countdown, toggleCapture }: ScreenCaptureControlsProps) => {
  const isActive = status === 'active';
  const interval = 5; // Set this to match the 5 second interval
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Capture console logs 
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    const captureLog = (type: 'info' | 'error' | 'success', args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' ');
      
      // Only capture screenshot and capture related logs
      if (message.includes('[useScreenCapture]') || 
          message.includes('[ScreenCapture]') || 
          message.includes('capture') || 
          message.includes('screenshot')) {
        
        setLogs(prev => [
          {
            message,
            timestamp: new Date().toLocaleTimeString(),
            type
          },
          ...prev.slice(0, 29) // Keep only last 30 logs
        ]);
      }
    };
    
    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      captureLog('info', args);
    };
    
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      captureLog('error', args);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);
  
  // Afficher des logs dans la console pour suivre l'état et le compte à rebours
  useEffect(() => {
    console.log(`[ScreenCapture] Status: ${status}, Countdown: ${countdown}/${interval}`);
    
    if (status === 'error') {
      console.error('[ScreenCapture] Capture error detected');
    }
  }, [status, countdown, interval]);
  
  return (
    <Card className="modern-card overflow-hidden">
      <CardHeader className="bg-gradient-primary pb-4">
        <CardTitle className="text-xl flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <div className="p-1 bg-white/20 rounded-full">
              <Clock size={18} className="text-white" />
            </div>
            <span>LiveScreenUploader</span>
          </span>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <FileText size={16} />
                <span className="ml-1">Logs</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Logs de capture d'écran</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[60vh] border rounded p-2 bg-black/5">
                {logs.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Aucun log disponible
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, i) => (
                      <div 
                        key={i} 
                        className={`p-1 rounded ${
                          log.type === 'error' 
                            ? 'bg-red-50 text-red-800 border-l-2 border-red-500' 
                            : log.type === 'success'
                              ? 'bg-green-50 text-green-800 border-l-2 border-green-500'
                              : 'border-l-2 border-gray-300'
                        }`}
                      >
                        <span className="text-gray-500">{log.timestamp}</span>:{' '}
                        {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Affichage des 30 derniers logs de capture d'écran</p>
                <p>Pour des logs plus détaillés, ouvrez la console développeur (F12)</p>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-medium">
                  Prochain screenshot dans: <span className="font-bold">{countdown}s</span>
                </span>
                <span className="text-sm font-medium px-2 py-0.5 bg-secondary rounded-full text-xs">
                  {status === 'active' 
                    ? "Capture active" 
                    : status === 'paused' 
                      ? "Capture en pause" 
                      : status === 'requesting-permission'
                        ? "Demande de permission..." 
                        : status === 'error'
                          ? "Erreur de permission" 
                          : "Inactif"}
                </span>
              </div>
              <Progress value={(countdown / interval) * 100} className="h-2" />
            </div>
          </div>
          
          <Button 
            variant={isActive ? "destructive" : "default"}
            onClick={() => {
              console.log('[ScreenCapture] Toggle capture button clicked');
              toggleCapture();
            }}
            className="w-full flex items-center justify-center gap-2 py-6 shadow-md"
            size="lg"
          >
            <div className="flex items-center justify-center gap-2">
              {isActive ? <Pause size={18} /> : <Play size={18} />}
              <span className="font-medium">
                {isActive ? "Mettre en pause" : "Reprendre la capture"}
              </span>
            </div>
          </Button>
          
          {status === 'error' && (
            <div className="mt-2 p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Erreur de permission</p>
                  <p>Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.</p>
                  <p className="mt-1 text-xs opacity-70">Consultez les logs de la console pour plus de détails (F12)</p>
                </div>
              </div>
            </div>
          )}
          {status === 'idle' && (
            <div className="mt-2 p-4 bg-primary/10 text-primary rounded-lg text-sm border border-primary/20">
              <p className="font-medium">Capture d'écran inactive</p>
              <p>Cliquez sur "Reprendre la capture" pour commencer à capturer votre écran.</p>
            </div>
          )}
          
          {/* Small log preview */}
          <div className="border rounded-md mt-2 overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-sm font-medium border-b flex justify-between items-center">
              <span>Derniers logs</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7">
                    Voir tout
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Logs de capture d'écran</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto max-h-[60vh] border rounded p-2 bg-black/5">
                    {logs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Aucun log disponible
                      </div>
                    ) : (
                      <div className="space-y-1 font-mono text-xs">
                        {logs.map((log, i) => (
                          <div 
                            key={i} 
                            className={`p-1 rounded ${
                              log.type === 'error' 
                                ? 'bg-red-50 text-red-800 border-l-2 border-red-500' 
                                : log.type === 'success'
                                  ? 'bg-green-50 text-green-800 border-l-2 border-green-500'
                                  : 'border-l-2 border-gray-300'
                            }`}
                          >
                            <span className="text-gray-500">{log.timestamp}</span>:{' '}
                            {log.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="max-h-36 overflow-y-auto p-2 bg-black/5">
              {logs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Aucun log disponible
                </div>
              ) : (
                <div className="space-y-1 font-mono text-xs">
                  {logs.slice(0, 5).map((log, i) => (
                    <div 
                      key={i} 
                      className={`p-1 rounded truncate ${
                        log.type === 'error' 
                          ? 'bg-red-50 text-red-800 border-l-2 border-red-500' 
                          : log.type === 'success'
                            ? 'bg-green-50 text-green-800 border-l-2 border-green-500'
                            : 'border-l-2 border-gray-300'
                      }`}
                    >
                      <span className="text-gray-500">{log.timestamp}</span>:{' '}
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenCaptureControls;
