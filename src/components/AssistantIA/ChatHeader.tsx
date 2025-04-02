
import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface ChatHeaderProps {
  setIsOptionsOpen: (isOpen: boolean) => void;
  saveConversation: () => void;
  clearConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  currentProject?: string;
  setCurrentProject?: (project: string) => void;
}

const ChatHeader = ({
  setIsOptionsOpen,
  saveConversation,
  clearConversation,
  useScreenshots,
  setUseScreenshots,
  currentProject = "Default Project",
  setCurrentProject = () => {}
}: ChatHeaderProps) => {
  const [newProjectName, setNewProjectName] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string, name: string }>>([]);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  
  // Charger la liste des projets
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setProjects(data);
        } else {
          // Si pas de projets, créer un par défaut
          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert({
              name: "Default Project",
              description: "Projet par défaut"
            })
            .select('id, name');
          
          if (createError) throw createError;
          
          if (newProject) {
            setProjects(newProject);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des projets:", error);
        toast.error("Impossible de charger la liste des projets");
      }
    };
    
    fetchProjects();
  }, []);
  
  // Créer un nouveau projet
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Veuillez entrer un nom de projet");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: newProjectName,
          description: `Projet créé le ${new Date().toLocaleDateString()}`
        })
        .select('id, name');
      
      if (error) throw error;
      
      if (data) {
        setProjects(prev => [...prev, ...data]);
        setCurrentProject(newProjectName);
        toast.success(`Projet "${newProjectName}" créé avec succès`);
        setNewProjectName("");
        setIsCreateProjectOpen(false);
      }
    } catch (error) {
      console.error("Erreur lors de la création du projet:", error);
      toast.error("Impossible de créer le nouveau projet");
    }
  };
  
  return (
    <CardHeader className="bg-muted/30 pb-3 border-b">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg mr-2">Assistant IA</CardTitle>
          
          <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
            <DialogTrigger asChild>
              <Select value={currentProject} onValueChange={setCurrentProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__"><span className="text-primary">+ Créer un projet</span></SelectItem>
                </SelectContent>
              </Select>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Créer un nouveau projet</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project-name" className="text-right">
                    Nom
                  </Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Annuler</Button>
                </DialogClose>
                <Button onClick={handleCreateProject}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <Switch
              id="screenshots"
              checked={useScreenshots}
              onCheckedChange={setUseScreenshots}
            />
            <Label htmlFor="screenshots" className="text-sm cursor-pointer">
              {useScreenshots ? <Eye size={14} className="inline mr-1" /> : <EyeOff size={14} className="inline mr-1" />}
              {useScreenshots ? 'Captures' : 'No Captures'}
            </Label>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsOptionsOpen(true)}>
                Options
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveConversation}>
                <Save size={14} className="mr-2" />
                Sauvegarder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clearConversation}>
                <Trash2 size={14} className="mr-2" />
                Effacer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
