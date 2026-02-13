import { useState } from 'react';
import { useGetAllProjects, useUpdateProject, useDeleteProject, useGetAllContacts, useCreateProject, useGetCallerUserProfile, useGetAllCostItems } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar as CalendarIcon, List, Trash2, Edit, X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { DynamicSelect } from '../components/DynamicSelect';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { CalendarView } from '../components/CalendarView';
import { BaseDialog } from '../components/BaseDialog';
import { CostItemsSection } from '../components/CostItemsSection';
import { ProjectTimelineInput, TimelineMode } from '../components/ProjectTimelineInput';
import { useFocusOnMount } from '../lib/focusManager';
import { getKategorien, addKategorie } from '../lib/customCategories';
import { formatDateRangeSmart, monthToTimestamps, validateMonthRange, timestampToMonth, isFullMonthRange } from '../lib/dateUtils';
import { toast } from 'sonner';
import { UserType } from '../backend';
import type { Project, CostItem } from '../backend';

export default function Roadmap() {
  const { data: projects, isLoading } = useGetAllProjects();
  const { data: contacts = [] } = useGetAllContacts();
  const { data: userProfile } = useGetCallerUserProfile();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [kategorienOptions, setKategorienOptions] = useState<string[]>(getKategorien());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [editCostItems, setEditCostItems] = useState<CostItem[]>([]);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('exact');
  const [editTimelineMode, setEditTimelineMode] = useState<TimelineMode>('exact');
  const [newProject, setNewProject] = useState({
    name: '',
    kunde: '',
    color: '#3b82f6',
    exactStartDate: '',
    exactEndDate: '',
    monthStartDate: '',
    monthEndDate: '',
    kategorie: 'none',
    verantwortlicherKontakt: 'none',
  });

  // Focus management - persistent refs that don't remount
  const projectNameInputRef = useFocusOnMount<HTMLInputElement>(isCreateProjectOpen);
  const editNameInputRef = useFocusOnMount<HTMLInputElement>(isEditOpen);

  // Get user principal for cost items
  const userPrincipal = identity?.getPrincipal() || null;

  // Check if user is private (hide kunde field)
  const isPrivateUser = userProfile?.userType === UserType.privat;

  const filteredProjects = selectedCategory
    ? projects?.filter((p) => p.kategorie === selectedCategory)
    : projects;

  const formatDate = (timestamp?: bigint) => {
    if (!timestamp) return null;
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateForInput = (timestamp?: bigint) => {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp) / 1000000);
    return date.toISOString().split('T')[0];
  };

  const getContactName = (contactId?: string): string | null => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name ?? null;
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newProject.name.trim() || !newProject.kategorie || newProject.kategorie === 'none') {
      toast.error('Project name and category are required');
      return;
    }
    
    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error('Customer is required');
      return;
    }

    if (!userPrincipal) {
      toast.error('User not authenticated');
      return;
    }

    let startTimestamp: bigint | null = null;
    let endTimestamp: bigint | null = null;

    // Handle timeline based on mode
    if (timelineMode === 'exact') {
      // Validate date range only if both dates are provided
      if (newProject.exactStartDate && newProject.exactEndDate) {
        const start = new Date(newProject.exactStartDate);
        const end = new Date(newProject.exactEndDate);
        if (end < start) {
          toast.error('End date cannot be before start date');
          return;
        }
        startTimestamp = BigInt(start.getTime() * 1000000);
        endTimestamp = BigInt(end.getTime() * 1000000);
      } else if (newProject.exactStartDate) {
        startTimestamp = BigInt(new Date(newProject.exactStartDate).getTime() * 1000000);
      } else if (newProject.exactEndDate) {
        endTimestamp = BigInt(new Date(newProject.exactEndDate).getTime() * 1000000);
      }
    } else {
      // Month range mode
      if (newProject.monthStartDate && newProject.monthEndDate) {
        if (!validateMonthRange(newProject.monthStartDate, newProject.monthEndDate)) {
          toast.error('End month cannot be before start month');
          return;
        }
        const startRange = monthToTimestamps(newProject.monthStartDate);
        const endRange = monthToTimestamps(newProject.monthEndDate);
        startTimestamp = startRange.start;
        endTimestamp = endRange.end;
      } else if (newProject.monthStartDate) {
        const startRange = monthToTimestamps(newProject.monthStartDate);
        startTimestamp = startRange.start;
      } else if (newProject.monthEndDate) {
        const endRange = monthToTimestamps(newProject.monthEndDate);
        endTimestamp = endRange.end;
      }
    }

    const projectId = `project_${Date.now()}`;

    // Ensure all cost items have the correct owner before submission
    const validatedCostItems = costItems.map(item => ({
      ...item,
      owner: userPrincipal,
      projektId: projectId,
    }));

    await createProject.mutateAsync({
      id: projectId,
      name: newProject.name,
      kunde: isPrivateUser ? null : newProject.kunde,
      color: newProject.color,
      start: startTimestamp,
      end: endTimestamp,
      kategorie: newProject.kategorie,
      verantwortlicherKontakt: newProject.verantwortlicherKontakt === 'none' ? null : newProject.verantwortlicherKontakt,
      costItems: validatedCostItems,
    });

    setNewProject({
      name: '',
      kunde: '',
      color: '#3b82f6',
      exactStartDate: '',
      exactEndDate: '',
      monthStartDate: '',
      monthEndDate: '',
      kategorie: 'none',
      verantwortlicherKontakt: 'none',
    });
    setCostItems([]);
    setTimelineMode('exact');
    setIsCreateProjectOpen(false);
  };

  const handleEditClick = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    
    // Detect if this is a month-range project
    const isMonthRange = project.startDate && project.endDate && isFullMonthRange(project.startDate, project.endDate);
    
    setNewProject({
      name: project.name,
      kunde: project.kunde,
      color: project.color || '#3b82f6',
      exactStartDate: formatDateForInput(project.startDate),
      exactEndDate: formatDateForInput(project.endDate),
      monthStartDate: project.startDate ? timestampToMonth(project.startDate) : '',
      monthEndDate: project.endDate ? timestampToMonth(project.endDate) : '',
      kategorie: project.kategorie,
      verantwortlicherKontakt: project.verantwortlicherKontakt || 'none',
    });
    
    setEditTimelineMode(isMonthRange ? 'month' : 'exact');
    
    // Load existing cost items for this project using the actor from component level
    try {
      if (actor) {
        const existingCostItems = await actor.getKostenpunkteByProjekt(project.id);
        setEditCostItems(existingCostItems);
      } else {
        setEditCostItems([]);
      }
    } catch (error) {
      console.error('Error loading cost items:', error);
      setEditCostItems([]);
    }
    
    setIsEditOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectToEdit || !newProject.name.trim() || !newProject.kategorie || newProject.kategorie === 'none') {
      toast.error('Project name and category are required');
      return;
    }
    
    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error('Customer is required');
      return;
    }

    if (!userPrincipal) {
      toast.error('User not authenticated');
      return;
    }

    let startTimestamp: bigint | null = null;
    let endTimestamp: bigint | null = null;

    // Handle timeline based on mode
    if (editTimelineMode === 'exact') {
      // Validate date range only if both dates are provided
      if (newProject.exactStartDate && newProject.exactEndDate) {
        const start = new Date(newProject.exactStartDate);
        const end = new Date(newProject.exactEndDate);
        if (end < start) {
          toast.error('End date cannot be before start date');
          return;
        }
        startTimestamp = BigInt(start.getTime() * 1000000);
        endTimestamp = BigInt(end.getTime() * 1000000);
      } else if (newProject.exactStartDate) {
        startTimestamp = BigInt(new Date(newProject.exactStartDate).getTime() * 1000000);
      } else if (newProject.exactEndDate) {
        endTimestamp = BigInt(new Date(newProject.exactEndDate).getTime() * 1000000);
      }
    } else {
      // Month range mode
      if (newProject.monthStartDate && newProject.monthEndDate) {
        if (!validateMonthRange(newProject.monthStartDate, newProject.monthEndDate)) {
          toast.error('End month cannot be before start month');
          return;
        }
        const startRange = monthToTimestamps(newProject.monthStartDate);
        const endRange = monthToTimestamps(newProject.monthEndDate);
        startTimestamp = startRange.start;
        endTimestamp = endRange.end;
      } else if (newProject.monthStartDate) {
        const startRange = monthToTimestamps(newProject.monthStartDate);
        startTimestamp = startRange.start;
      } else if (newProject.monthEndDate) {
        const endRange = monthToTimestamps(newProject.monthEndDate);
        endTimestamp = endRange.end;
      }
    }

    // Ensure all cost items have the correct owner before submission
    const validatedCostItems = editCostItems.map(item => ({
      ...item,
      owner: userPrincipal,
      projektId: projectToEdit.id,
    }));

    await updateProject.mutateAsync({
      id: projectToEdit.id,
      name: newProject.name,
      kunde: isPrivateUser ? null : newProject.kunde,
      color: newProject.color,
      start: startTimestamp,
      end: endTimestamp,
      kategorie: newProject.kategorie,
      verantwortlicherKontakt: newProject.verantwortlicherKontakt === 'none' ? null : newProject.verantwortlicherKontakt,
      costItems: validatedCostItems,
    });

    setNewProject({
      name: '',
      kunde: '',
      color: '#3b82f6',
      exactStartDate: '',
      exactEndDate: '',
      monthStartDate: '',
      monthEndDate: '',
      kategorie: 'none',
      verantwortlicherKontakt: 'none',
    });
    setEditCostItems([]);
    setProjectToEdit(null);
    setEditTimelineMode('exact');
    setIsEditOpen(false);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteProject.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAddKategorie = (newKat: string) => {
    addKategorie(newKat);
    setKategorienOptions(getKategorien());
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];
    return colors[index % colors.length];
  };

  const getCategoryProjects = (category: string) => {
    return projects?.filter(p => p.kategorie === category) || [];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground mt-2">
            Timeline overview of your project phases
          </p>
        </div>
        <div className="flex gap-2">
          <BaseDialog
            open={isCreateProjectOpen}
            onOpenChange={(open) => {
              setIsCreateProjectOpen(open);
              if (!open) {
                setCostItems([]);
                setTimelineMode('exact');
              }
            }}
            title="Neues Projekt erstellen"
            description="Erstellen Sie ein neues Bauprojekt mit Kostenpunkten"
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Projekt erstellen
              </Button>
            }
          >
            <form onSubmit={handleCreateProject} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="name">Projektname *</Label>
                <Input
                  ref={projectNameInputRef}
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="z.B. Dachsanierung Hauptgebäude"
                  required
                />
              </div>
              {!isPrivateUser && (
                <div className="space-y-2">
                  <Label htmlFor="kunde">Kunde *</Label>
                  <Input
                    id="kunde"
                    value={newProject.kunde}
                    onChange={(e) => setNewProject({ ...newProject, kunde: e.target.value })}
                    placeholder="Kundenname"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="color">Projektfarbe</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="color"
                    type="color"
                    value={newProject.color}
                    onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                    className="h-10 w-20 rounded border border-input cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    Wählen Sie eine Farbe für dieses Projekt
                  </span>
                </div>
              </div>

              <ProjectTimelineInput
                mode={timelineMode}
                onModeChange={setTimelineMode}
                exactStartDate={newProject.exactStartDate}
                exactEndDate={newProject.exactEndDate}
                monthStartDate={newProject.monthStartDate}
                monthEndDate={newProject.monthEndDate}
                onExactStartChange={(value) => setNewProject({ ...newProject, exactStartDate: value })}
                onExactEndChange={(value) => setNewProject({ ...newProject, exactEndDate: value })}
                onMonthStartChange={(value) => setNewProject({ ...newProject, monthStartDate: value })}
                onMonthEndChange={(value) => setNewProject({ ...newProject, monthEndDate: value })}
              />

              <DynamicSelect
                id="kategorie"
                label="Kategorie"
                value={newProject.kategorie}
                onValueChange={(value) => setNewProject({ ...newProject, kategorie: value })}
                options={kategorienOptions}
                onAddOption={handleAddKategorie}
                placeholder="Kategorie wählen..."
                required
              />
              <div className="space-y-2">
                <Label htmlFor="verantwortlicherKontakt">Verantwortlicher Kontakt</Label>
                <Select value={newProject.verantwortlicherKontakt} onValueChange={(value) => setNewProject({ ...newProject, verantwortlicherKontakt: value })}>
                  <SelectTrigger id="verantwortlicherKontakt">
                    <SelectValue placeholder="Kontakt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Kontakt</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.firma && `(${contact.firma})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Items Section */}
              <CostItemsSection
                costItems={costItems}
                onChange={setCostItems}
                projectId={`project_${Date.now()}`}
                userPrincipal={userPrincipal}
              />

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Erstelle...' : 'Projekt erstellen'}
                </Button>
              </div>
            </form>
          </BaseDialog>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'calendar')}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Kalender
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Alle
            </Button>
            {kategorienOptions.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Projects List */}
          {filteredProjects && filteredProjects.length > 0 ? (
            <div className="space-y-4">
              {kategorienOptions.map((category) => {
                const categoryProjects = getCategoryProjects(category);
                if (categoryProjects.length === 0) return null;

                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: categoryProjects[0]?.color || getCategoryColor(kategorienOptions.indexOf(category)) }}
                        />
                        {category}
                        <Badge variant="secondary" className="ml-auto">
                          {categoryProjects.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {categoryProjects.map((project) => (
                        <Collapsible key={project.id}>
                          <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => toggleProjectExpansion(project.id)}
                              >
                                {expandedProjects.has(project.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{project.name}</p>
                                {project.kunde && (
                                  <Badge variant="outline" className="shrink-0">
                                    {project.kunde}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDateRangeSmart(project.startDate, project.endDate)}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleEditClick(project, e)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteClick(project, e)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CollapsibleContent className="px-3 py-2">
                            <div className="space-y-2 text-sm">
                              {project.verantwortlicherKontakt && (
                                <p className="text-muted-foreground">
                                  Kontakt: {getContactName(project.verantwortlicherKontakt) || 'Unbekannt'}
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Projekte gefunden</p>
                  <p className="text-sm mt-2">Erstellen Sie Ihr erstes Projekt</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView projects={projects || []} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <BaseDialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setProjectToEdit(null);
            setEditCostItems([]);
            setEditTimelineMode('exact');
          }
        }}
        title="Projekt bearbeiten"
        description="Bearbeiten Sie die Projektdetails"
      >
        <form onSubmit={handleUpdateProject} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Projektname *</Label>
            <Input
              ref={editNameInputRef}
              id="edit-name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="z.B. Dachsanierung Hauptgebäude"
              required
            />
          </div>
          {!isPrivateUser && (
            <div className="space-y-2">
              <Label htmlFor="edit-kunde">Kunde *</Label>
              <Input
                id="edit-kunde"
                value={newProject.kunde}
                onChange={(e) => setNewProject({ ...newProject, kunde: e.target.value })}
                placeholder="Kundenname"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-color">Projektfarbe</Label>
            <div className="flex items-center gap-3">
              <input
                id="edit-color"
                type="color"
                value={newProject.color}
                onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                className="h-10 w-20 rounded border border-input cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                Wählen Sie eine Farbe für dieses Projekt
              </span>
            </div>
          </div>

          <ProjectTimelineInput
            mode={editTimelineMode}
            onModeChange={setEditTimelineMode}
            exactStartDate={newProject.exactStartDate}
            exactEndDate={newProject.exactEndDate}
            monthStartDate={newProject.monthStartDate}
            monthEndDate={newProject.monthEndDate}
            onExactStartChange={(value) => setNewProject({ ...newProject, exactStartDate: value })}
            onExactEndChange={(value) => setNewProject({ ...newProject, exactEndDate: value })}
            onMonthStartChange={(value) => setNewProject({ ...newProject, monthStartDate: value })}
            onMonthEndChange={(value) => setNewProject({ ...newProject, monthEndDate: value })}
          />

          <DynamicSelect
            id="edit-kategorie"
            label="Kategorie"
            value={newProject.kategorie}
            onValueChange={(value) => setNewProject({ ...newProject, kategorie: value })}
            options={kategorienOptions}
            onAddOption={handleAddKategorie}
            placeholder="Kategorie wählen..."
            required
          />
          <div className="space-y-2">
            <Label htmlFor="edit-verantwortlicherKontakt">Verantwortlicher Kontakt</Label>
            <Select value={newProject.verantwortlicherKontakt} onValueChange={(value) => setNewProject({ ...newProject, verantwortlicherKontakt: value })}>
              <SelectTrigger id="edit-verantwortlicherKontakt">
                <SelectValue placeholder="Kontakt wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Kontakt</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.firma && `(${contact.firma})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost Items Section */}
          <CostItemsSection
            costItems={editCostItems}
            onChange={setEditCostItems}
            projectId={projectToEdit?.id || ''}
            userPrincipal={userPrincipal}
          />

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </form>
      </BaseDialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Projekt löschen"
        description="Möchten Sie dieses Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={projectToDelete?.name}
        isPending={deleteProject.isPending}
      />
    </div>
  );
}
