
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bug, XCircle } from 'lucide-react';
import DebuggerDialog from './debugging/DebuggerDialog';

interface ScreenCaptureDebuggerProps {
  getDiagnostics: () => any;
}

const ScreenCaptureDebugger = ({ getDiagnostics }: ScreenCaptureDebuggerProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
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

  const clearLogs = () => {
    setLogs([]);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
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
      
      <DebuggerDialog
        open={open}
        setOpen={setOpen}
        diagnostics={diagnostics}
        logs={logs}
        refreshDiagnostics={refreshDiagnostics}
        clearLogs={clearLogs}
        autoRefresh={autoRefresh}
        toggleAutoRefresh={toggleAutoRefresh}
      />
    </>
  );
};

export default ScreenCaptureDebugger;
