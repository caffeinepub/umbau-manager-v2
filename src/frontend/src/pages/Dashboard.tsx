import { useState, useMemo } from 'react';
import { useGetAllProjects, useGetAllTasks, useCreateProject, useCreateTask, useChangeTaskStatus, useGetAllContacts, useGetKostenUebersicht, useGetCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building2, CheckCircle2, Clock, AlertCircle, Plus, Calendar, ArrowRight, Euro } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DynamicSelect } from '../components/DynamicSelect';
import { BaseDialog } from '../components/BaseDialog';
import { CostItemsSection } from '../components/CostItemsSection';
import { useFocusOnMount } from '../lib/focusManager';
import { getKategorien, addKategorie, getGewerke, addGewerke, getBereiche, addBereich } from '../lib/customCategories';
import { isThisWeek } from '../lib/dateUtils';
import { CalendarWidget } from '../components/CalendarWidget';
import { toast } from 'sonner';
import { UserType } from '../backend';
import type { CostItem } from '../backend';

export default function Dashboard() {
  const { data: projects, isLoading: projectsLoading } = useGetAllProjects();
  const { data: allTasks = [] } = useGetAllTasks();
  const { data: contacts = [] } = useGetAllContacts();
  const { data: kostenUebersicht } = useGetKostenUebersicht();
  const { data: userProfile } = useGetCallerUserProfile();
  const { identity } = useInternetIdentity();
  
  const [kategorienOptions, setKategorienOptions] = useState<string[]>(getKategorien());
  const [gewerkeOptions, setGewerkeOptions] = useState<string[]>(getGewerke());
  const [bereicheOptions, setBereicheOptions] = useState<string[]>(getBereiche());
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [newProject, setNewProject] = useState({
    name: '',
    kunde: '',
    color: '#3b82f6',
    startDate: '',
    endDate: '',
    kategorie: 'none',
    verantwortlicherKontakt: 'none',
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

  const createProject = useCreateProject();
  const createTask = useCreateTask();
  const changeTaskStatus = useChangeTaskStatus();

  // Focus management
  const projectNameInputRef = useFocusOnMount<HTMLInputElement>(isCreateProjectOpen);
  const taskTitleInputRef = useFocusOnMount<HTMLInputElement>(isCreateTaskOpen);

  // Get user principal for cost items
  const userPrincipal = identity?.getPrincipal() || null;

  // Check if user is private (hide kunde field)
  const isPrivateUser = userProfile?.userType === UserType.privat;

  // Filter tasks by status
  const aufgabenTasks = useMemo(() => allTasks.filter(t => t.status === 'Aufgaben'), [allTasks]);
  const dieseWocheTasks = useMemo(() => allTasks.filter(t => t.status === 'Diese Woche'), [allTasks]);
  const feedbackTasks = useMemo(() => allTasks.filter(t => t.status === 'Benötigt Feedback'), [allTasks]);
  const erledigtTasks = useMemo(() => allTasks.filter(t => t.status === 'Erledigt'), [allTasks]);

  // Dynamic "Diese Woche" tasks based on due date
  const thisWeekDueTasks = useMemo(() => {
    return allTasks.filter(task => 
      task.status !== 'Erledigt' && isThisWeek(task.faelligkeit)
    );
  }, [allTasks]);

  const totalTasks = aufgabenTasks.length + dieseWocheTasks.length + feedbackTasks.length;
  const completedTasks = erledigtTasks.length;

  const stats = [
    {
      title: 'Aktive Projekte',
      value: projects?.length || 0,
      icon: Building2,
      description: 'Laufende Bauprojekte',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
      page: 'roadmap' as const,
    },
    {
      title: 'Offene Aufgaben',
      value: totalTasks,
      icon: Clock,
      description: 'Zu erledigende Tasks',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
      page: 'tasks' as const,
      filter: 'open',
    },
    {
      title: 'Erledigt',
      value: completedTasks,
      icon: CheckCircle2,
      description: 'Abgeschlossene Aufgaben',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-950',
      page: 'tasks' as const,
      filter: 'completed',
    },
    {
      title: 'Benötigt Feedback',
      value: feedbackTasks.length,
      icon: AlertCircle,
      description: 'Warten auf Rückmeldung',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
      page: 'tasks' as const,
      filter: 'feedback',
    },
  ];

  const upcomingDeadlines = [...aufgabenTasks, ...dieseWocheTasks, ...feedbackTasks]
    .sort((a, b) => Number(a.faelligkeit - b.faelligkeit))
    .slice(0, 5);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For private users, kunde is not required in the form (will be auto-filled by backend)
    // For business users, kunde is required
    if (!newProject.name.trim() || !newProject.startDate || !newProject.endDate || !newProject.kategorie || newProject.kategorie === 'none') {
      return;
    }
    
    if (!isPrivateUser && !newProject.kunde.trim()) {
      toast.error('Kunde ist erforderlich');
      return;
    }

    if (!userPrincipal) {
      toast.error('Benutzer nicht authentifiziert');
      return;
    }

    const projectId = `project_${Date.now()}`;
    const startTimestamp = BigInt(new Date(newProject.startDate).getTime() * 1000000);
    const endTimestamp = BigInt(new Date(newProject.endDate).getTime() * 1000000);

    // Ensure all cost items have the correct owner before submission
    const validatedCostItems = costItems.map(item => ({
      ...item,
      owner: userPrincipal,
      projektId: projectId,
    }));

    await createProject.mutateAsync({
      id: projectId,
      name: newProject.name,
      kunde: isPrivateUser ? null : newProject.kunde, // Pass null for private users, backend will auto-fill
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

  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    await changeTaskStatus.mutateAsync({ taskId, newStatus });
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getDringlichkeitColor = (dringlichkeit: bigint) => {
    const level = Number(dringlichkeit);
    if (level === 3) return 'bg-red-500';
    if (level === 2) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact?.name;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects?.find(p => p.id === projectId);
    return project?.name;
  };

  const handleAddKategorie = (newKat: string) => {
    addKategorie(newKat);
    setKategorienOptions(getKategorien());
  };

  const handleAddGewerke = (newGew: string) => {
    addGewerke(newGew);
    setGewerkeOptions(getGewerke());
  };

  const handleAddBereich = (newBer: string) => {
    addBereich(newBer);
    setBereicheOptions(getBereiche());
  };

  const handleStatCardClick = (page: 'roadmap' | 'tasks' | 'kostenuebersicht', filter?: string) => {
    // This will be handled by App.tsx navigation
    const event = new CustomEvent('navigate', { detail: { page, filter } });
    window.dispatchEvent(event);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht über Ihre Bauprojekte und Aufgaben
          </p>
        </div>
        <div className="flex gap-2">
          <BaseDialog
            open={isCreateProjectOpen}
            onOpenChange={(open) => {
              setIsCreateProjectOpen(open);
              if (!open) setCostItems([]);
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdatum *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Enddatum *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
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
                  {createProject.isPending ? 'Wird erstellt...' : 'Erstellen'}
                </Button>
              </div>
            </form>
          </BaseDialog>

          <BaseDialog
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            title="Neue Aufgabe erstellen"
            description="Erstellen Sie eine neue Aufgabe für Ihr Bauprojekt"
            trigger={
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Aufgabe hinzufügen
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
                    {projects?.map((project) => (
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

      {/* Statistics Cards - Now Clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {projectsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          stats.map((stat) => (
            <Card 
              key={stat.title} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleStatCardClick(stat.page, stat.filter)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Cost Overview Widget - Clickable */}
      {kostenUebersicht && (
        <Card 
          className="border-emerald-200 dark:border-emerald-900 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => handleStatCardClick('kostenuebersicht')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Euro className="h-5 w-5" />
              Kostenübersicht
            </CardTitle>
            <CardDescription>Gesamtkosten aller Projekte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">{formatCurrency(kostenUebersicht.gesamt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bezahlt</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(kostenUebersicht.bezahlt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(kostenUebersicht.offen)}
                </p>
              </div>
            </div>
            {kostenUebersicht.gesamt > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Fortschritt</span>
                  <span>
                    {Math.round((kostenUebersicht.bezahlt / kostenUebersicht.gesamt) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 dark:bg-green-400 transition-all"
                    style={{
                      width: `${(kostenUebersicht.bezahlt / kostenUebersicht.gesamt) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Projekte</CardTitle>
            <CardDescription>Ihre laufenden Bauprojekte</CardDescription>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{project.kunde}</p>
                      {project.verantwortlicherKontakt && (
                        <p className="text-xs text-muted-foreground truncate">
                          {getContactName(project.verantwortlicherKontakt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Noch keine Projekte vorhanden
              </p>
            )}
          </CardContent>
        </Card>

        {/* Important Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Wichtige Termine
            </CardTitle>
            <CardDescription>Anstehende Fristen</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${getDringlichkeitColor(task.dringlichkeit)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.titel}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">{task.gewerke}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">{formatDate(task.faelligkeit)}</p>
                      </div>
                      {task.projectId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projekt: {getProjectName(task.projectId)}
                        </p>
                      )}
                      {task.verantwortlicherKontakt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {getContactName(task.verantwortlicherKontakt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine anstehenden Termine
              </p>
            )}
          </CardContent>
        </Card>

        {/* This Week Tasks - Dynamic */}
        <Card>
          <CardHeader>
            <CardTitle>Diese Woche</CardTitle>
            <CardDescription>Aufgaben für diese Woche</CardDescription>
          </CardHeader>
          <CardContent>
            {thisWeekDueTasks.length > 0 ? (
              <div className="space-y-3">
                {thisWeekDueTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${getDringlichkeitColor(task.dringlichkeit)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.titel}</p>
                      <p className="text-xs text-muted-foreground">{task.gewerke}</p>
                      <p className="text-xs text-muted-foreground">Fällig: {formatDate(task.faelligkeit)}</p>
                      {task.projectId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projekt: {getProjectName(task.projectId)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Keine Aufgaben für diese Woche
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Widget */}
      {projects && projects.length > 0 && (
        <CalendarWidget projects={projects} tasks={allTasks} />
      )}

      {/* Feedback Required Section */}
      {feedbackTasks.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <AlertCircle className="h-5 w-5" />
              Benötigt Feedback
            </CardTitle>
            <CardDescription>Aufgaben, die auf Ihre Rückmeldung warten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feedbackTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${getDringlichkeitColor(task.dringlichkeit)}`} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <p className="font-medium text-sm">{task.titel}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.beschreibung}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Badge variant="outline" className="text-xs">{task.gewerke}</Badge>
                        <Badge variant="outline" className="text-xs">{task.bereich}</Badge>
                        {task.projectId && (
                          <Badge variant="outline" className="text-xs">
                            {getProjectName(task.projectId)}
                          </Badge>
                        )}
                        {task.verantwortlicherKontakt && (
                          <Badge variant="outline" className="text-xs">
                            {getContactName(task.verantwortlicherKontakt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleQuickStatusChange(task.id, 'Diese Woche')}
                        disabled={changeTaskStatus.isPending}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Diese Woche
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleQuickStatusChange(task.id, 'Erledigt')}
                        disabled={changeTaskStatus.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Erledigt
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
