import { useState, useMemo } from 'react';
import { useGetAllTasks, useChangeTaskStatus, useCreateTask, useUpdateTask, useDeleteTask, useGetAllContacts, useGetAllProjects } from '../hooks/useQueries';
import type { TaskV2 } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, Edit, Plus, Filter, X } from 'lucide-react';
import { DynamicSelect } from '../components/DynamicSelect';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { BaseDialog } from '../components/BaseDialog';
import { useFocusOnMount } from '../lib/focusManager';
import { getGewerke, addGewerke, getBereiche, addBereich } from '../lib/customCategories';

const COLUMNS = [
  { id: 'Aufgaben', label: 'Aufgaben', color: 'bg-gray-500' },
  { id: 'Diese Woche', label: 'Diese Woche', color: 'bg-blue-500' },
  { id: 'Benötigt Feedback', label: 'Benötigt Feedback', color: 'bg-orange-500' },
  { id: 'Erledigt', label: 'Erledigt', color: 'bg-green-500' },
];

export default function Tasks() {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskV2 | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<TaskV2 | null>(null);
  const [gewerkeOptions, setGewerkeOptions] = useState<string[]>(getGewerke());
  const [bereicheOptions, setBereicheOptions] = useState<string[]>(getBereiche());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    projectId: 'all',
    gewerke: 'all',
    bereich: 'all',
  });
  const [newTask, setNewTask] = useState({
    titel: '',
    beschreibung: '',
    gewerke: 'none',
    dringlichkeit: '1',
    bereich: 'none',
    kategorie: '',
    faelligkeit: '',
    verantwortlicherKontakt: 'none',
    projectId: 'none',
  });

  const { data: allTasks = [], isLoading: tasksLoading } = useGetAllTasks();
  const { data: contacts = [] } = useGetAllContacts();
  const { data: projects = [] } = useGetAllProjects();

  const changeStatus = useChangeTaskStatus();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Focus management
  const taskTitleInputRef = useFocusOnMount<HTMLInputElement>(isCreateTaskOpen);
  const editTitleInputRef = useFocusOnMount<HTMLInputElement>(isEditOpen);

  // Sort tasks chronologically by due date
  const sortTasksByDueDate = (tasks: TaskV2[]) => {
    return [...tasks].sort((a, b) => {
      // Tasks without due dates go to the bottom
      if (!a.faelligkeit && !b.faelligkeit) return 0;
      if (!a.faelligkeit) return 1;
      if (!b.faelligkeit) return -1;
      
      // Sort by due date ascending (soonest first)
      return Number(a.faelligkeit - b.faelligkeit);
    });
  };

  // Apply filters
  const filteredTasks = useMemo(() => {
    let filtered = allTasks;

    if (filters.projectId !== 'all') {
      filtered = filtered.filter(t => t.projectId === filters.projectId);
    }

    if (filters.gewerke !== 'all') {
      filtered = filtered.filter(t => t.gewerke === filters.gewerke);
    }

    if (filters.bereich !== 'all') {
      filtered = filtered.filter(t => t.bereich === filters.bereich);
    }

    return filtered;
  }, [allTasks, filters]);

  // Filter and sort tasks by status
  const aufgabenTasks = useMemo(() => sortTasksByDueDate(filteredTasks.filter(t => t.status === 'Aufgaben')), [filteredTasks]);
  const dieseWocheTasks = useMemo(() => sortTasksByDueDate(filteredTasks.filter(t => t.status === 'Diese Woche')), [filteredTasks]);
  const feedbackTasks = useMemo(() => sortTasksByDueDate(filteredTasks.filter(t => t.status === 'Benötigt Feedback')), [filteredTasks]);
  const erledigtTasks = useMemo(() => sortTasksByDueDate(filteredTasks.filter(t => t.status === 'Erledigt')), [filteredTasks]);

  const columns = useMemo(() => [
    { ...COLUMNS[0], tasks: aufgabenTasks, isLoading: tasksLoading },
    { ...COLUMNS[1], tasks: dieseWocheTasks, isLoading: tasksLoading },
    { ...COLUMNS[2], tasks: feedbackTasks, isLoading: tasksLoading },
    { ...COLUMNS[3], tasks: erledigtTasks, isLoading: tasksLoading },
  ], [aufgabenTasks, dieseWocheTasks, feedbackTasks, erledigtTasks, tasksLoading]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await changeStatus.mutateAsync({ taskId, newStatus });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.titel.trim() || !newTask.gewerke || newTask.gewerke === 'none' || !newTask.bereich || newTask.bereich === 'none' || !newTask.faelligkeit) return;

    const taskId = `task_${Date.now()}`;
    const fälligkeitTimestamp = BigInt(new Date(newTask.faelligkeit).getTime() * 1000000);

    await createTask.mutateAsync({
      id: taskId,
      titel: newTask.titel,
      beschreibung: newTask.beschreibung,
      gewerke: newTask.gewerke,
      status: 'Aufgaben',
      dringlichkeit: BigInt(newTask.dringlichkeit),
      bereich: newTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: newTask.kategorie || 'Allgemein',
      verantwortlicherKontakt: newTask.verantwortlicherKontakt === 'none' ? null : newTask.verantwortlicherKontakt,
      projectId: newTask.projectId === 'none' ? null : newTask.projectId,
    });

    setNewTask({
      titel: '',
      beschreibung: '',
      gewerke: 'none',
      dringlichkeit: '1',
      bereich: 'none',
      kategorie: '',
      faelligkeit: '',
      verantwortlicherKontakt: 'none',
      projectId: 'none',
    });
    setIsCreateTaskOpen(false);
  };

  const handleEditClick = (task: TaskV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToEdit(task);
    const fälligkeitDate = new Date(Number(task.faelligkeit) / 1000000);
    setNewTask({
      titel: task.titel,
      beschreibung: task.beschreibung,
      gewerke: task.gewerke,
      dringlichkeit: task.dringlichkeit.toString(),
      bereich: task.bereich,
      kategorie: task.kategorie,
      faelligkeit: fälligkeitDate.toISOString().split('T')[0],
      verantwortlicherKontakt: task.verantwortlicherKontakt || 'none',
      projectId: task.projectId || 'none',
    });
    setIsEditOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit || !newTask.titel.trim() || !newTask.gewerke || newTask.gewerke === 'none' || !newTask.bereich || newTask.bereich === 'none' || !newTask.faelligkeit) return;

    const fälligkeitTimestamp = BigInt(new Date(newTask.faelligkeit).getTime() * 1000000);

    await updateTask.mutateAsync({
      id: taskToEdit.id,
      titel: newTask.titel,
      beschreibung: newTask.beschreibung,
      gewerke: newTask.gewerke,
      status: taskToEdit.status,
      dringlichkeit: BigInt(newTask.dringlichkeit),
      bereich: newTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: newTask.kategorie || 'Allgemein',
      verantwortlicherKontakt: newTask.verantwortlicherKontakt === 'none' ? null : newTask.verantwortlicherKontakt,
      projectId: newTask.projectId === 'none' ? null : newTask.projectId,
    });

    setNewTask({
      titel: '',
      beschreibung: '',
      gewerke: 'none',
      dringlichkeit: '1',
      bereich: 'none',
      kategorie: '',
      faelligkeit: '',
      verantwortlicherKontakt: 'none',
      projectId: 'none',
    });
    setTaskToEdit(null);
    setIsEditOpen(false);
  };

  const handleDeleteClick = (task: TaskV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteTask.mutateAsync(taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const getDringlichkeitColor = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return 'bg-red-500';
    if (level === 2) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getDringlichkeitLabel = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return 'Hoch';
    if (level === 2) return 'Mittel';
    return 'Niedrig';
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name;
  };

  const handleAddGewerke = (newGewerke: string) => {
    addGewerke(newGewerke);
    setGewerkeOptions(getGewerke());
  };

  const handleAddBereich = (newBereich: string) => {
    addBereich(newBereich);
    setBereicheOptions(getBereiche());
  };

  const clearFilters = () => {
    setFilters({
      projectId: 'all',
      gewerke: 'all',
      bereich: 'all',
    });
  };

  const hasActiveFilters = filters.projectId !== 'all' || filters.gewerke !== 'all' || filters.bereich !== 'all';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-muted-foreground mt-2">
            Kanban-Board für Ihre Bauaufgaben
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {[filters.projectId, filters.gewerke, filters.bereich].filter(f => f !== 'all').length}
              </Badge>
            )}
          </Button>
          <BaseDialog
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            title="Neue Aufgabe erstellen"
            description="Erstellen Sie eine neue Aufgabe für Ihr Bauprojekt"
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Neue Aufgabe
              </Button>
            }
          >
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titel">Titel *</Label>
                <Input
                  ref={taskTitleInputRef}
                  id="titel"
                  value={newTask.titel}
                  onChange={(e) => setNewTask({ ...newTask, titel: e.target.value })}
                  placeholder="Aufgabentitel"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beschreibung">Beschreibung</Label>
                <Textarea
                  id="beschreibung"
                  value={newTask.beschreibung}
                  onChange={(e) => setNewTask({ ...newTask, beschreibung: e.target.value })}
                  placeholder="Detaillierte Beschreibung..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DynamicSelect
                  id="gewerke"
                  label="Gewerke"
                  value={newTask.gewerke}
                  onValueChange={(value) => setNewTask({ ...newTask, gewerke: value })}
                  options={gewerkeOptions}
                  onAddOption={handleAddGewerke}
                  placeholder="Wählen..."
                  required
                />
                <DynamicSelect
                  id="bereich"
                  label="Bereich"
                  value={newTask.bereich}
                  onValueChange={(value) => setNewTask({ ...newTask, bereich: value })}
                  options={bereicheOptions}
                  onAddOption={handleAddBereich}
                  placeholder="Wählen..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faelligkeit">Fälligkeit *</Label>
                <Input
                  id="faelligkeit"
                  type="date"
                  value={newTask.faelligkeit}
                  onChange={(e) => setNewTask({ ...newTask, faelligkeit: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dringlichkeit">Dringlichkeit</Label>
                <Select value={newTask.dringlichkeit} onValueChange={(value) => setNewTask({ ...newTask, dringlichkeit: value })}>
                  <SelectTrigger id="dringlichkeit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Niedrig</SelectItem>
                    <SelectItem value="2">Mittel</SelectItem>
                    <SelectItem value="3">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectId">Projekt</Label>
                <Select value={newTask.projectId} onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}>
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Projekt wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Projekt</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verantwortlicherKontakt">Verantwortlicher Kontakt</Label>
                <Select value={newTask.verantwortlicherKontakt} onValueChange={(value) => setNewTask({ ...newTask, verantwortlicherKontakt: value })}>
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
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? 'Wird erstellt...' : 'Erstellen'}
                </Button>
              </div>
            </form>
          </BaseDialog>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="filter-project">Projekt</Label>
                <Select value={filters.projectId} onValueChange={(value) => setFilters({ ...filters, projectId: value })}>
                  <SelectTrigger id="filter-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Projekte</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="filter-gewerke">Gewerke</Label>
                <Select value={filters.gewerke} onValueChange={(value) => setFilters({ ...filters, gewerke: value })}>
                  <SelectTrigger id="filter-gewerke">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Gewerke</SelectItem>
                    {gewerkeOptions.map((gewerke) => (
                      <SelectItem key={gewerke} value={gewerke}>
                        {gewerke}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="filter-bereich">Bereich</Label>
                <Select value={filters.bereich} onValueChange={(value) => setFilters({ ...filters, bereich: value })}>
                  <SelectTrigger id="filter-bereich">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Bereiche</SelectItem>
                    {bereicheOptions.map((bereich) => (
                      <SelectItem key={bereich} value={bereich}>
                        {bereich}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Aktive Filter:</span>
          {filters.projectId !== 'all' && (
            <Badge variant="secondary">
              Projekt: {getProjectName(filters.projectId)}
              <button
                onClick={() => setFilters({ ...filters, projectId: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.gewerke !== 'all' && (
            <Badge variant="secondary">
              Gewerke: {filters.gewerke}
              <button
                onClick={() => setFilters({ ...filters, gewerke: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.bereich !== 'all' && (
            <Badge variant="secondary">
              Bereich: {filters.bereich}
              <button
                onClick={() => setFilters({ ...filters, bereich: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <Card key={column.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${column.color}`} />
                <CardTitle className="text-base">{column.label}</CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {column.tasks.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
              {column.isLoading ? (
                <>
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </>
              ) : column.tasks.length > 0 ? (
                column.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-medium text-sm leading-tight">{task.titel}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {task.gewerke}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <div className={`h-1.5 w-1.5 rounded-full ${getDringlichkeitColor(task.dringlichkeit)}`} />
                            <span className="text-xs text-muted-foreground">
                              {getDringlichkeitLabel(task.dringlichkeit)}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Fällig: {formatDate(task.faelligkeit)}
                        </div>
                        {task.projectId && (
                          <div className="text-xs font-medium text-primary">
                            Projekt: {getProjectName(task.projectId)}
                          </div>
                        )}
                        {task.verantwortlicherKontakt && (
                          <div className="text-xs text-muted-foreground">
                            {getContactName(task.verantwortlicherKontakt)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => handleEditClick(task, e)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteClick(task, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {column.id !== 'Erledigt' && (
                          <div className="flex gap-1 pt-1 flex-wrap">
                            {COLUMNS.filter(c => c.id !== column.id).map((targetCol) => (
                              <Button
                                key={targetCol.id}
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-2"
                                onClick={() => handleStatusChange(task.id, targetCol.id)}
                              >
                                → {targetCol.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Keine Aufgaben
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <BaseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Aufgabe bearbeiten"
        description="Bearbeiten Sie die Aufgabendetails"
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-titel">Titel *</Label>
            <Input
              ref={editTitleInputRef}
              id="edit-titel"
              value={newTask.titel}
              onChange={(e) => setNewTask({ ...newTask, titel: e.target.value })}
              placeholder="Aufgabentitel"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-beschreibung">Beschreibung</Label>
            <Textarea
              id="edit-beschreibung"
              value={newTask.beschreibung}
              onChange={(e) => setNewTask({ ...newTask, beschreibung: e.target.value })}
              placeholder="Detaillierte Beschreibung..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DynamicSelect
              id="edit-gewerke"
              label="Gewerke"
              value={newTask.gewerke}
              onValueChange={(value) => setNewTask({ ...newTask, gewerke: value })}
              options={gewerkeOptions}
              onAddOption={handleAddGewerke}
              placeholder="Wählen..."
              required
            />
            <DynamicSelect
              id="edit-bereich"
              label="Bereich"
              value={newTask.bereich}
              onValueChange={(value) => setNewTask({ ...newTask, bereich: value })}
              options={bereicheOptions}
              onAddOption={handleAddBereich}
              placeholder="Wählen..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-faelligkeit">Fälligkeit *</Label>
            <Input
              id="edit-faelligkeit"
              type="date"
              value={newTask.faelligkeit}
              onChange={(e) => setNewTask({ ...newTask, faelligkeit: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-dringlichkeit">Dringlichkeit</Label>
            <Select value={newTask.dringlichkeit} onValueChange={(value) => setNewTask({ ...newTask, dringlichkeit: value })}>
              <SelectTrigger id="edit-dringlichkeit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Niedrig</SelectItem>
                <SelectItem value="2">Mittel</SelectItem>
                <SelectItem value="3">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-projectId">Projekt</Label>
            <Select value={newTask.projectId} onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}>
              <SelectTrigger id="edit-projectId">
                <SelectValue placeholder="Projekt wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-verantwortlicherKontakt">Verantwortlicher Kontakt</Label>
            <Select value={newTask.verantwortlicherKontakt} onValueChange={(value) => setNewTask({ ...newTask, verantwortlicherKontakt: value })}>
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
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? 'Wird aktualisiert...' : 'Aktualisieren'}
            </Button>
          </div>
        </form>
      </BaseDialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Aufgabe löschen"
        description="Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={taskToDelete?.titel}
      />
    </div>
  );
}
