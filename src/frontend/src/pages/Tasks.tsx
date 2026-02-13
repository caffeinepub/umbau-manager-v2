import { useState, useEffect, useMemo } from 'react';
import { useGetAllTasks, useCreateTask, useUpdateTask, useDeleteTask, useGetAllProjects, useGetAllContacts } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Clock, AlertCircle, Filter, Search } from 'lucide-react';
import { DynamicSelect } from '../components/DynamicSelect';
import { BaseDialog } from '../components/BaseDialog';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useFocusOnMount } from '../lib/focusManager';
import { getGewerke, addGewerke, getBereiche, addBereich } from '../lib/customCategories';
import { combineDateTimeToTimestamp, extractDateFromTimestamp, extractTimeFromTimestamp, formatDateTimeGerman } from '../lib/dateUtils';
import { getAndClearSelectedTaskId } from '../utils/urlParams';
import { toast } from 'sonner';
import type { Task } from '../backend';

const STATUSES = ['Aufgaben', 'Diese Woche', 'Benötigt Feedback', 'Erledigt'];

export default function Tasks() {
  const { data: tasks = [], isLoading } = useGetAllTasks();
  const { data: projects = [] } = useGetAllProjects();
  const { data: contacts = [] } = useGetAllContacts();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { identity } = useInternetIdentity();

  const [gewerkeOptions, setGewerkeOptions] = useState<string[]>(getGewerke());
  const [bereicheOptions, setBereicheOptions] = useState<string[]>(getBereiche());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dringlichkeitFilter, setDringlichkeitFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const [newTask, setNewTask] = useState({
    titel: '',
    beschreibung: '',
    gewerke: 'none',
    status: 'Aufgaben',
    dringlichkeit: '1',
    bereich: 'none',
    kategorie: '',
    faelligkeitDate: '',
    faelligkeitTime: '',
    verantwortlicherKontakt: 'none',
    projectId: 'none',
  });

  const titleInputRef = useFocusOnMount<HTMLInputElement>(isCreateOpen || !!editingTask);

  // Check for selected task from Dashboard navigation
  useEffect(() => {
    const selectedTaskId = getAndClearSelectedTaskId();
    if (selectedTaskId) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        openEditTask(task);
      }
    }
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        searchTerm === '' ||
        task.titel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.beschreibung.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesDringlichkeit =
        dringlichkeitFilter === 'all' || task.dringlichkeit.toString() === dringlichkeitFilter;
      const matchesProject =
        projectFilter === 'all' ||
        (projectFilter === 'none' && !task.projectId) ||
        task.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesDringlichkeit && matchesProject;
    });
  }, [tasks, searchTerm, statusFilter, dringlichkeitFilter, projectFilter]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUSES.forEach((status) => {
      grouped[status] = filteredTasks
        .filter((task) => task.status === status)
        .sort((a, b) => Number(a.faelligkeit - b.faelligkeit));
    });
    return grouped;
  }, [filteredTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTask.titel.trim() ||
      !newTask.gewerke ||
      newTask.gewerke === 'none' ||
      !newTask.bereich ||
      newTask.bereich === 'none' ||
      !newTask.faelligkeitDate
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const taskId = `task_${Date.now()}`;
    const fälligkeitTimestamp = combineDateTimeToTimestamp(newTask.faelligkeitDate, newTask.faelligkeitTime);

    await createTask.mutateAsync({
      id: taskId,
      titel: newTask.titel,
      beschreibung: newTask.beschreibung,
      gewerke: newTask.gewerke,
      status: newTask.status,
      dringlichkeit: BigInt(newTask.dringlichkeit),
      bereich: newTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: newTask.kategorie || 'Allgemein',
      verantwortlicherKontakt: newTask.verantwortlicherKontakt === 'none' ? null : newTask.verantwortlicherKontakt,
      projectId: newTask.projectId === 'none' ? null : newTask.projectId,
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (
      !newTask.titel.trim() ||
      !newTask.gewerke ||
      newTask.gewerke === 'none' ||
      !newTask.bereich ||
      newTask.bereich === 'none' ||
      !newTask.faelligkeitDate
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    const fälligkeitTimestamp = combineDateTimeToTimestamp(newTask.faelligkeitDate, newTask.faelligkeitTime);

    await updateTask.mutateAsync({
      id: editingTask.id,
      titel: newTask.titel,
      beschreibung: newTask.beschreibung,
      gewerke: newTask.gewerke,
      status: newTask.status,
      dringlichkeit: BigInt(newTask.dringlichkeit),
      bereich: newTask.bereich,
      faelligkeit: fälligkeitTimestamp,
      kategorie: newTask.kategorie || 'Allgemein',
      verantwortlicherKontakt: newTask.verantwortlicherKontakt === 'none' ? null : newTask.verantwortlicherKontakt,
      projectId: newTask.projectId === 'none' ? null : newTask.projectId,
    });

    resetForm();
    setEditingTask(null);
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
    } catch (error) {
      console.error('Delete task error:', error);
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      titel: task.titel,
      beschreibung: task.beschreibung,
      gewerke: task.gewerke,
      status: task.status,
      dringlichkeit: task.dringlichkeit.toString(),
      bereich: task.bereich,
      kategorie: task.kategorie,
      faelligkeitDate: extractDateFromTimestamp(task.faelligkeit),
      faelligkeitTime: extractTimeFromTimestamp(task.faelligkeit),
      verantwortlicherKontakt: task.verantwortlicherKontakt || 'none',
      projectId: task.projectId || 'none',
    });
  };

  const resetForm = () => {
    setNewTask({
      titel: '',
      beschreibung: '',
      gewerke: 'none',
      status: 'Aufgaben',
      dringlichkeit: '1',
      bereich: 'none',
      kategorie: '',
      faelligkeitDate: '',
      faelligkeitTime: '',
      verantwortlicherKontakt: 'none',
      projectId: 'none',
    });
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingTask(null);
    resetForm();
  };

  const handleAddGewerke = (newGew: string) => {
    addGewerke(newGew);
    setGewerkeOptions(getGewerke());
  };

  const handleAddBereich = (newBer: string) => {
    addBereich(newBer);
    setBereicheOptions(getBereiche());
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

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find((c) => c.id === contactId);
    return contact?.name;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find((p) => p.id === projectId);
    return project?.name;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aufgaben</h1>
          <p className="text-muted-foreground mt-2">Verwalten Sie Ihre Aufgaben im Kanban-Board</p>
        </div>
        <BaseDialog
          open={isCreateOpen || !!editingTask}
          onOpenChange={(open) => {
            if (!open) closeDialog();
            else if (!editingTask) setIsCreateOpen(true);
          }}
          title={editingTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
          description={
            editingTask ? 'Bearbeiten Sie die Aufgabendetails' : 'Erstellen Sie eine neue Aufgabe für Ihr Projekt'
          }
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Aufgabe erstellen
            </Button>
          }
        >
          <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel *</Label>
              <Input
                ref={titleInputRef}
                id="titel"
                value={newTask.titel}
                onChange={(e) => setNewTask({ ...newTask, titel: e.target.value })}
                placeholder="z.B. Dachziegel bestellen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beschreibung">Beschreibung</Label>
              <Textarea
                id="beschreibung"
                value={newTask.beschreibung}
                onChange={(e) => setNewTask({ ...newTask, beschreibung: e.target.value })}
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                rows={3}
              />
            </div>
            <DynamicSelect
              id="gewerke"
              label="Gewerke"
              value={newTask.gewerke}
              onValueChange={(value) => setNewTask({ ...newTask, gewerke: value })}
              options={gewerkeOptions}
              onAddOption={handleAddGewerke}
              placeholder="Gewerke wählen..."
              required
            />
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={newTask.status} onValueChange={(value) => setNewTask({ ...newTask, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dringlichkeit">Dringlichkeit</Label>
              <Select
                value={newTask.dringlichkeit}
                onValueChange={(value) => setNewTask({ ...newTask, dringlichkeit: value })}
              >
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
            <DynamicSelect
              id="bereich"
              label="Bereich"
              value={newTask.bereich}
              onValueChange={(value) => setNewTask({ ...newTask, bereich: value })}
              options={bereicheOptions}
              onAddOption={handleAddBereich}
              placeholder="Bereich wählen..."
              required
            />
            <div className="space-y-2">
              <Label htmlFor="kategorie">Kategorie</Label>
              <Input
                id="kategorie"
                value={newTask.kategorie}
                onChange={(e) => setNewTask({ ...newTask, kategorie: e.target.value })}
                placeholder="z.B. Planung, Ausführung..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faelligkeitDate">Fälligkeitsdatum *</Label>
                <Input
                  id="faelligkeitDate"
                  type="date"
                  value={newTask.faelligkeitDate}
                  onChange={(e) => setNewTask({ ...newTask, faelligkeitDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faelligkeitTime">Uhrzeit</Label>
                <Input
                  id="faelligkeitTime"
                  type="time"
                  value={newTask.faelligkeitTime}
                  onChange={(e) => setNewTask({ ...newTask, faelligkeitTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verantwortlicherKontakt">Verantwortlicher Kontakt</Label>
              <Select
                value={newTask.verantwortlicherKontakt}
                onValueChange={(value) => setNewTask({ ...newTask, verantwortlicherKontakt: value })}
              >
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
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                {editingTask ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </form>
        </BaseDialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Suche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Aufgaben durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="statusFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dringlichkeitFilter">Dringlichkeit</Label>
              <Select value={dringlichkeitFilter} onValueChange={setDringlichkeitFilter}>
                <SelectTrigger id="dringlichkeitFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="1">Niedrig</SelectItem>
                  <SelectItem value="2">Mittel</SelectItem>
                  <SelectItem value="3">Hoch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectFilter">Projekt</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger id="projectFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Projekte</SelectItem>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Aufgaben...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="text-lg">{status}</CardTitle>
                <CardDescription>{tasksByStatus[status].length} Aufgaben</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasksByStatus[status].length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Keine Aufgaben</div>
                ) : (
                  tasksByStatus[status].map((task) => {
                    const contactName = getContactName(task.verantwortlicherKontakt);
                    const projectName = getProjectName(task.projectId);

                    return (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openEditTask(task)}
                      >
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm line-clamp-2">{task.titel}</h4>
                            <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${getDringlichkeitColor(task.dringlichkeit)}`} />
                          </div>
                          {task.beschreibung && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.beschreibung}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">
                              {task.gewerke}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getDringlichkeitLabel(task.dringlichkeit)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTimeGerman(task.faelligkeit)}</span>
                          </div>
                          {contactName && (
                            <div className="text-xs text-muted-foreground">Kontakt: {contactName}</div>
                          )}
                          {projectName && (
                            <div className="text-xs text-muted-foreground">Projekt: {projectName}</div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        onConfirm={handleDeleteTask}
        title="Aufgabe löschen"
        description="Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={tasks.find((t) => t.id === deleteTaskId)?.titel}
        isPending={deleteTask.isPending}
      />
    </div>
  );
}
