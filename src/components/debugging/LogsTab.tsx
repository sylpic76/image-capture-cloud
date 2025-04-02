
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from 'lucide-react';

interface LogsTabProps {
  logs: string[];
  clearLogs: () => void;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
}

const LogsTab = ({ logs, clearLogs, autoRefresh, toggleAutoRefresh }: LogsTabProps) => {
  const logRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            Effacer
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Auto-refresh</span>
          <Button
            variant={autoRefresh ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleAutoRefresh}
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
    </div>
  );
};

export default LogsTab;
