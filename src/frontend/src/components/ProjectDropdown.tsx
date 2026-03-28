import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { useProjectSession } from "../hooks/useProjectSession";
import {
  useDeleteProject,
  useGetTopLevelProjects,
  useUpdateProject,
} from "../hooks/useQueries";

interface ProjectDropdownProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onCreateNew: () => void;
}

export default function ProjectDropdown({
  currentProjectId,
  onProjectSelect,
  onCreateNew,
}: ProjectDropdownProps) {
  const { data: projects = [], isLoading } = useGetTopLevelProjects();
  const { setLastUsedProjectId } = useProjectSession();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [renameProject, setRenameProject] = useState<
    (typeof projects)[0] | null
  >(null);
  const [deleteProjectState, setDeleteProjectState] = useState<
    (typeof projects)[0] | null
  >(null);
  const [renameValue, setRenameValue] = useState("");

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleSelect = (projectId: string) => {
    setLastUsedProjectId(projectId);
    onProjectSelect(projectId);
    setOpen(false);
  };

  const handleRenameOpen = (project: (typeof projects)[0]) => {
    setRenameProject(project);
    setRenameValue(project.name);
  };

  const handleRenameConfirm = () => {
    if (!renameProject || !renameValue.trim()) return;
    updateProject.mutate({
      id: renameProject.id,
      name: renameValue.trim(),
      kunde: renameProject.kunde ?? null,
      color: renameProject.color || "#3b82f6",
      start: renameProject.startDate ?? null,
      end: renameProject.endDate ?? null,
      kategorie: renameProject.kategorie || "",
      verantwortlicherKontakt: renameProject.verantwortlicherKontakt ?? null,
      costItems: [],
    });
    setRenameProject(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteProjectState) return;
    const id = deleteProjectState.id;
    deleteProject.mutate(id, {
      onSuccess: () => {
        if (id === currentProjectId) {
          onProjectSelect(null);
        }
      },
    });
    setDeleteProjectState(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 h-9 min-w-[160px] max-w-[220px] text-left"
            data-ocid="project-dropdown.button"
          >
            {currentProject ? (
              <>
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: currentProject.color || "#3b82f6" }}
                />
                <span className="truncate flex-1 text-sm">
                  {currentProject.name}
                </span>
              </>
            ) : (
              <span className="truncate flex-1 text-sm text-muted-foreground">
                {isLoading ? "Lädt..." : "Kein Projekt"}
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          {projects.length === 0 && !isLoading ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              Keine Projekte vorhanden
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 rounded-md hover:bg-accent group"
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 flex-1 px-2 py-2 text-left min-w-0"
                    onClick={() => handleSelect(project.id)}
                    data-ocid="project-dropdown.item.button"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color || "#3b82f6" }}
                    />
                    <span className="truncate text-sm">{project.name}</span>
                    {project.id === currentProjectId && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                        onClick={(e) => e.stopPropagation()}
                        data-ocid="project-dropdown.item.dropdown_menu"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameOpen(project);
                        }}
                        data-ocid="project-dropdown.rename.button"
                      >
                        Umbenennen
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteProjectState(project);
                        }}
                        data-ocid="project-dropdown.delete.button"
                      >
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
          <Separator className="my-1" />
          <button
            type="button"
            className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-sm text-primary font-medium hover:bg-accent"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            data-ocid="project-dropdown.create_new.button"
          >
            <Plus className="h-4 w-4" />
            Neues Projekt erstellen
          </button>
        </PopoverContent>
      </Popover>

      {/* Rename Dialog */}
      <Dialog
        open={!!renameProject}
        onOpenChange={(v) => !v && setRenameProject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projekt umbenennen</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRenameConfirm()}
            placeholder="Projektname"
            data-ocid="project-dropdown.rename.input"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameProject(null)}
              data-ocid="project-dropdown.rename.cancel_button"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleRenameConfirm}
              disabled={!renameValue.trim() || updateProject.isPending}
              data-ocid="project-dropdown.rename.confirm_button"
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deleteProjectState}
        onOpenChange={(v) => !v && setDeleteProjectState(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Projekt <strong>{deleteProjectState?.name}</strong> und alle
              zugehörigen Daten werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="project-dropdown.delete.cancel_button">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="project-dropdown.delete.confirm_button"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
