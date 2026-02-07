import { useState, useEffect } from 'react';
import { useGetAllProjects, useUpdateProject, useDeleteProject, useGetAllContacts, useCreateProject, useCreateCustomCategory, useDeleteCustomCategory, useGetTasksByProjectId, useGetCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import type { TaskV2 } from '../hooks/useQueries';
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
import { useFocusOnMount } from '../lib/focusManager';
import { getKategorien, addKategorie } from '../lib/customCategories';
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
  const createCustomCategory = useCreateCustomCategory();
  const deleteCustomCategory = useDeleteCustomCategory();
  const [kategorienOptions, setKategorienOptions] = useState<string[]>(getKategorien());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#3b82f6');
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [editCostItems, setEditCostItems] = useState<CostItem[]>([]);
  const [newProject, setNewProject] = useState({
    name: '',
    kunde: '',
    color: '#3b82f6',
    startDate: '',
    endDate: '',
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
    if (!timestamp) return 'No dates set';
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

    const projectId = `project_${Date.now()}`;
    const startTimestamp = newProject.startDate ? BigInt(new Date(newProject.startDate).getTime() * 1000000) : null;
    const endTimestamp = newProject.endDate ? BigInt(new Date(newProject.endDate).getTime() * 1000000) : null;

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
      startDate: '',
      endDate: '',
      kategorie: 'none',
      verantwortlicherKontakt: 'none',
    });
    setCostItems([]);
    setIsCreateProjectOpen(false);
  };

  const handleEditClick = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setNewProject({
      name: project.name,
      kunde: project.kunde,
      color: project.color || '#3b82f6',
      startDate: formatDateForInput(project.startDate),
      endDate: formatDateForInput(project.endDate),
      kategorie: project.kategorie,
      verantwortlicherKontakt: project.verantwortlicherKontakt || 'none',
    });
    
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

    const startTimestamp = newProject.startDate ? BigInt(new Date(newProject.startDate).getTime() * 1000000) : null;
    const endTimestamp = newProject.endDate ? BigInt(new Date(newProject.endDate).getTime() * 1000000) : null;

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
      startDate: '',
      endDate: '',
      kategorie: 'none',
      verantwortlicherKontakt: 'none',
    });
    setEditCostItems([]);
    setProjectToEdit(null);
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

  const handleAddKategorie = async (newKat: string) => {
    try {
      await createCustomCategory.mutateAsync({ categoryType: 'kategorien', categoryName: newKat });
      addKategorie(newKat);
      setKategorienOptions(getKategorien());
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditCategoryValue(category);
    const categoryProject = projects?.find(p => p.kategorie === category);
    setEditCategoryColor(categoryProject?.color || getCategoryColor(kategorienOptions.indexOf(category)));
  };

  const handleSaveCategory = async () => {
    if (!editingCategory || !editCategoryValue.trim()) return;
    
    const oldCategory = editingCategory;
    const newCategory = editCategoryValue.trim();
    
    if (oldCategory === newCategory) {
      if (projects) {
        const projectsToUpdate = projects.filter(p => p.kategorie === oldCategory);
        for (const project of projectsToUpdate) {
          try {
            await updateProject.mutateAsync({
              id: project.id,
              name: project.name,
              kunde: isPrivateUser ? null : project.kunde,
              color: editCategoryColor,
              start: project.startDate || null,
              end: project.endDate || null,
              kategorie: newCategory,
              verantwortlicherKontakt: project.verantwortlicherKontakt || null,
            });
          } catch (error) {
            console.error('Error updating project:', error);
          }
        }
      }
    } else {
      try {
        await createCustomCategory.mutateAsync({ categoryType: 'kategorien', categoryName: newCategory });
        addKategorie(newCategory);
        setKategorienOptions(getKategorien());
        
        if (projects) {
          const projectsToUpdate = projects.filter(p => p.kategorie === oldCategory);
          for (const project of projectsToUpdate) {
            await updateProject.mutateAsync({
              id: project.id,
              name: project.name,
              kunde: isPrivateUser ? null : project.kunde,
              color: editCategoryColor,
              start: project.startDate || null,
              end: project.endDate || null,
              kategorie: newCategory,
              verantwortlicherKontakt: project.verantwortlicherKontakt || null,
            });
          }
        }
        
        await deleteCustomCategory.mutateAsync({ categoryType: 'kategorien', categoryName: oldCategory });
      } catch (error) {
        console.error('Error updating category:', error);
      }
    }
    
    setEditingCategory(null);
  };

  const handleDeleteCategory = (category: string) => {
    setCategoryToDelete(category);
    setDeleteCategoryDialogOpen(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    
    try {
      await deleteCustomCategory.mutateAsync({ categoryType: 'kategorien', categoryName: categoryToDelete });
      const updatedKategorien = kategorienOptions.filter(k => k !== categoryToDelete);
      setKategorienOptions(updatedKategorien);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
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
        <Button onClick={() => setIsCreateProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'calendar')}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {kategorienOptions.map((kategorie, index) => {
            const categoryProjects = getCategoryProjects(kategorie);
            if (categoryProjects.length === 0) return null;

            return (
              <Collapsible key={kategorie} defaultOpen>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className="h-5 w-5 transition-transform [[data-state=open]>&]:rotate-90" />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getCategoryColor(index) }}
                          />
                          {editingCategory === kategorie ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editCategoryValue}
                                onChange={(e) => setEditCategoryValue(e.target.value)}
                                className="h-8 w-48"
                              />
                              <input
                                type="color"
                                value={editCategoryColor}
                                onChange={(e) => setEditCategoryColor(e.target.value)}
                                className="h-8 w-12 cursor-pointer"
                              />
                              <Button size="sm" onClick={handleSaveCategory}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <CardTitle>{kategorie}</CardTitle>
                              <Badge variant="secondary">{categoryProjects.length}</Badge>
                            </>
                          )}
                        </div>
                        {!editingCategory && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCategory(kategorie)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(kategorie)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {categoryProjects.map((project) => {
                        const contactName = getContactName(project.verantwortlicherKontakt);
                        const isExpanded = expandedProjects.has(project.id);

                        return (
                          <Card key={project.id} className="overflow-hidden">
                            <div
                              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => toggleProjectExpansion(project.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-1 h-12 rounded-full"
                                    style={{ backgroundColor: project.color || getCategoryColor(index) }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold">{project.name}</h3>
                                      {!isPrivateUser && (
                                        <Badge variant="outline">{project.kunde}</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span>
                                        {formatDate(project.startDate)} - {formatDate(project.endDate)}
                                      </span>
                                      {contactName && (
                                        <>
                                          <span>•</span>
                                          <span>{contactName}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleEditClick(project, e)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => handleDeleteClick(project, e)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <ChevronDown
                                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {(!projects || projects.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView
            projects={projects || []}
            getCategoryColor={getCategoryColor}
            kategorien={kategorienOptions}
          />
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <BaseDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        title="Create New Project"
        description="Add a new project to your roadmap"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              ref={projectNameInputRef}
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="e.g., Kitchen Renovation"
            />
          </div>

          {!isPrivateUser && (
            <div className="space-y-2">
              <Label htmlFor="project-kunde">Customer *</Label>
              <Input
                id="project-kunde"
                value={newProject.kunde}
                onChange={(e) => setNewProject({ ...newProject, kunde: e.target.value })}
                placeholder="Customer name"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-start">Start Date</Label>
              <Input
                id="project-start"
                type="date"
                value={newProject.startDate}
                onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end">End Date</Label>
              <Input
                id="project-end"
                type="date"
                value={newProject.endDate}
                onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-kategorie">Category *</Label>
            <DynamicSelect
              value={newProject.kategorie}
              onValueChange={(value) => setNewProject({ ...newProject, kategorie: value })}
              options={kategorienOptions}
              onAddOption={handleAddKategorie}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-color">Project Color</Label>
            <input
              id="project-color"
              type="color"
              value={newProject.color}
              onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-contact">Responsible Contact</Label>
            <Select
              value={newProject.verantwortlicherKontakt}
              onValueChange={(value) => setNewProject({ ...newProject, verantwortlicherKontakt: value })}
            >
              <SelectTrigger id="project-contact">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {userPrincipal && (
            <CostItemsSection
              costItems={costItems}
              onChange={setCostItems}
              projectId="new"
              userPrincipal={userPrincipal}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </BaseDialog>

      {/* Edit Project Dialog */}
      <BaseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Project"
        description="Update project details"
      >
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-project-name">Project Name *</Label>
            <Input
              id="edit-project-name"
              ref={editNameInputRef}
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="e.g., Kitchen Renovation"
            />
          </div>

          {!isPrivateUser && (
            <div className="space-y-2">
              <Label htmlFor="edit-project-kunde">Customer *</Label>
              <Input
                id="edit-project-kunde"
                value={newProject.kunde}
                onChange={(e) => setNewProject({ ...newProject, kunde: e.target.value })}
                placeholder="Customer name"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-start">Start Date</Label>
              <Input
                id="edit-project-start"
                type="date"
                value={newProject.startDate}
                onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-end">End Date</Label>
              <Input
                id="edit-project-end"
                type="date"
                value={newProject.endDate}
                onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-kategorie">Category *</Label>
            <DynamicSelect
              value={newProject.kategorie}
              onValueChange={(value) => setNewProject({ ...newProject, kategorie: value })}
              options={kategorienOptions}
              onAddOption={handleAddKategorie}
              placeholder="Select category"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-color">Project Color</Label>
            <input
              id="edit-project-color"
              type="color"
              value={newProject.color}
              onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-md border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-project-contact">Responsible Contact</Label>
            <Select
              value={newProject.verantwortlicherKontakt}
              onValueChange={(value) => setNewProject({ ...newProject, verantwortlicherKontakt: value })}
            >
              <SelectTrigger id="edit-project-contact">
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {userPrincipal && projectToEdit && (
            <CostItemsSection
              costItems={editCostItems}
              onChange={setEditCostItems}
              projectId={projectToEdit.id}
              userPrincipal={userPrincipal}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </BaseDialog>

      {/* Delete Project Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        itemName={projectToDelete?.name}
        isPending={deleteProject.isPending}
      />

      {/* Delete Category Confirmation */}
      <DeleteConfirmDialog
        open={deleteCategoryDialogOpen}
        onOpenChange={setDeleteCategoryDialogOpen}
        onConfirm={handleDeleteCategoryConfirm}
        title="Delete Category"
        description="Are you sure you want to delete this category? All projects in this category will remain but will need to be reassigned."
        itemName={categoryToDelete || undefined}
        isPending={deleteCustomCategory.isPending}
      />
    </div>
  );
}
