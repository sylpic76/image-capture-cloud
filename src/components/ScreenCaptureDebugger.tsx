
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Terminal, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

interface ScreenCaptureDebuggerProps {
  getDiagnostics: () => any;
}

const ScreenCaptureDebugger = ({ getDiagnostics }: ScreenCaptureDebuggerProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  
  const captureConsoleOutput = () => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    const maxLogs = 100; // Limit logs to prevent memory issues
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      if (args[0] && String(args[0]).includes('[useScreenCapture]')) {
        setLogs(prev => [formatLogEntry('log', args), ...prev.slice(0, maxLogs - 1)]);
      }
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      if (args[0] && String(args[0]).includes('[useScreenCapture ERROR]')) {
        setLogs(prev => [formatLogEntry('error', args), ...prev.slice(0, maxLogs - 1)]);
      }
    };
    
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      if (args[0] && String(args[0]).includes('[useScreenCapture]')) {
        setLogs(prev => [formatLogEntry('warn', args), ...prev.slice(0, maxLogs - 1)]);
      }
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  };
  
  const formatLogEntry = (type: 'log' | 'error' | 'warn', args: any[]) => {
    const time = new Date().toLocaleTimeString();
    const content = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    return `[${time}] [${type.toUpperCase()}] ${content}`;
  };
  
  const refreshDiagnostics = () => {
    const data = getDiagnostics();
    setDiagnostics(data);
  };
  
  useEffect(() => {
    const cleanup = captureConsoleOutput();
    return () => cleanup();
  }, []);
  
  useEffect(() => {
    if (open) {
      refreshDiagnostics();
    }
  }, [open, getDiagnostics]);
  
  useEffect(() => {
    let interval: number | null = null;
    
    if (autoRefresh && open) {
      interval = window.setInterval(() => {
        refreshDiagnostics();
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, open, getDiagnostics]);
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'requesting-permission': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Bug size={14} />
        <span>Logs</span>
        {diagnostics?.lastError && <XCircle size={14} className="text-red-500" />}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal size={16} className="text-primary" />
              Diagnostic de Capture d'Écran
            </DialogTitle>
            <DialogDescription>
              Informations détaillées sur le système de capture d'écran.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="diagnostics" className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="diagnostics">État Actuel</TabsTrigger>
              <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="diagnostics" className="flex-1 overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Diagnostics du système</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refreshDiagnostics}
                  >
                    <RefreshCw size={14} />
                  </Button>
                </div>
                
                {diagnostics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <Badge className={`${getStatusColor(diagnostics.status)}`}>
                        {diagnostics.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Compte à rebours</div>
                      <span>{diagnostics.countdown}s</span>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Media Stream</div>
                      {diagnostics.hasMediaStream ? (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          <CheckCircle2 size={14} className="mr-1" /> Actif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500 text-red-500">
                          <XCircle size={14} className="mr-1" /> Inactif
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Captures</div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="secondary">{diagnostics.captures}</Badge>
                        <span className="text-xs text-green-500">✓ {diagnostics.successful}</span>
                        <span className="text-xs text-red-500">✗ {diagnostics.failed}</span>
                      </div>
                    </div>
                    
                    {diagnostics.lastError && (
                      <div className="col-span-2">
                        <div className="text-xs text-muted-foreground mb-1">Dernière erreur</div>
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-mono">
                          {diagnostics.lastError}
                        </div>
                      </div>
                    )}
                    
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Navigateur</div>
                      <div className="text-xs font-mono break-all">{diagnostics.browserInfo}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40">
                    <span className="text-muted-foreground">Chargement des diagnostics...</span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="logs" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogs([])}
                  >
                    Effacer
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-refresh</span>
                  <Button
                    variant={autoRefresh ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>
              
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-2 font-mono text-xs" ref={logRef}>
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div 
                        key={i}
                        className={`py-0.5 px-1 ${
                          log.includes('[ERROR]') 
                            ? 'text-red-600 bg-red-50' 
                            : log.includes('[WARN]')
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-slate-800'
                        } ${i % 2 === 0 ? 'bg-opacity-50' : 'bg-opacity-25'}`}
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Aucun log de capture disponible
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScreenCaptureDebugger;
