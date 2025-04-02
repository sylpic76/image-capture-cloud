
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal } from 'lucide-react';
import DiagnosticsTab from './DiagnosticsTab';
import LogsTab from './LogsTab';

interface DebuggerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  diagnostics: any | null;
  logs: string[];
  refreshDiagnostics: () => void;
  clearLogs: () => void;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
}

const DebuggerDialog = ({
  open,
  setOpen,
  diagnostics,
  logs,
  refreshDiagnostics,
  clearLogs,
  autoRefresh,
  toggleAutoRefresh
}: DebuggerDialogProps) => {
  return (
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
            <DiagnosticsTab 
              diagnostics={diagnostics} 
              refreshDiagnostics={refreshDiagnostics} 
            />
          </TabsContent>
          
          <TabsContent value="logs" className="flex-1 overflow-hidden flex flex-col">
            <LogsTab 
              logs={logs}
              clearLogs={clearLogs}
              autoRefresh={autoRefresh}
              toggleAutoRefresh={toggleAutoRefresh}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DebuggerDialog;
