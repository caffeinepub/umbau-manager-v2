import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Project, CostItem, CostItemId, KostenUebersicht, UserType, ProjectId, ContactId, MediaPositionUpdate } from '../backend';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';

// Local type definitions for types not exported from backend
type TaskId = string;
type DocumentId = string;
type MediaId = string;
type Bereich = string;
type LinkId = string;

interface TaskV2 {
  id: TaskId;
  titel: string;
  beschreibung: string;
  gewerke: string;
  status: string;
  dringlichkeit: bigint;
  bereich: Bereich;
  faelligkeit: bigint;
  kategorie: string;
  verantwortlicherKontakt?: ContactId;
  projectId?: ProjectId;
  owner: any;
}

interface Dokument {
  id: DocumentId;
  name: string;
  bereich: Bereich;
  typ: string;
  status: string;
  blob: any;
  owner: any;
}

interface Medium {
  id: MediaId;
  name: string;
  kategorie: string;
  typ: string;
  position: bigint;
  tags: string[];
  blob: any;
  owner: any;
}

interface Kontakt {
  id: ContactId;
  name: string;
  firma: string;
  rolle: string;
  email: string;
  telefon: string;
  notizen: string;
  verknuepfteTasks: TaskId[];
  verknuepfteDokumente: DocumentId[];
  owner: any;
}

interface HilfreicherLink {
  id: LinkId;
  titel: string;
  beschreibung: string;
  url: string;
  kategorie: string;
  logoUrl: string;
  owner: any;
}

interface MediaFilterResult {
  filteredMedia: Medium[];
  activeFilters: {
    category?: string;
    mediaType?: string;
    nameSubstring: string;
  };
}

// Helper function to ensure actor is available with retry logic
async function withActorRetry<T>(
  actor: any,
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (!actor) {
      lastError = new Error('Actor not available');
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    } else {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries - 1 && error.message?.includes('Actor')) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw error;
      }
    }
  }
  
  throw lastError || new Error(`${operationName} failed: Actor not available`);
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.saveCallerUserProfile(profile);
      }, 'Save profile');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error saving profile: ${error.message}`);
    },
  });
}

// Project Queries
export function useGetAllProjects() {
  const { actor, isFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: ProjectId;
      name: string;
      kunde: string | null;
      color?: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt?: ContactId | null;
      costItems?: CostItem[];
    }) => {
      if (!params.name?.trim()) throw new Error('Project name is required');
      if (!params.kategorie?.trim()) throw new Error('Category is required');
      
      // Validate dates only if both are provided
      if (params.start && params.end && params.end < params.start) {
        throw new Error('End date must be after start date');
      }

      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.createProjekt(
          params.id,
          params.name.trim(),
          params.kunde,
          params.color || '#3b82f6',
          params.start,
          params.end,
          params.kategorie,
          params.verantwortlicherKontakt || null,
          params.costItems || []
        );
      }, 'Create project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error creating project: ${error.message}`);
    },
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: ProjectId;
      name: string;
      kunde: string | null;
      color?: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt?: ContactId | null;
      costItems?: CostItem[];
    }) => {
      if (!params.name?.trim()) throw new Error('Project name is required');
      if (!params.kategorie?.trim()) throw new Error('Category is required');
      
      // Validate dates only if both are provided
      if (params.start && params.end && params.end < params.start) {
        throw new Error('End date must be after start date');
      }

      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.updateProjekt(
          params.id,
          params.name.trim(),
          params.kunde,
          params.color || '#3b82f6',
          params.start,
          params.end,
          params.kategorie,
          params.verantwortlicherKontakt || null,
          params.costItems || []
        );
      }, 'Update project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating project: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: ProjectId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.deleteProjekt(id);
      }, 'Delete project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting project: ${error.message}`);
    },
  });
}

// Cost Item Queries
export function useGetKostenpunkteByProjekt(projectId: ProjectId | null) {
  const { actor, isFetching } = useActor();

  return useQuery<CostItem[]>({
    queryKey: ['costItems', 'project', projectId],
    queryFn: async () => {
      if (!actor || !projectId) return [];
      return actor.getKostenpunkteByProjekt(projectId);
    },
    enabled: !!actor && !isFetching && !!projectId,
  });
}

export function useGetAllKostenpunkte() {
  const { actor, isFetching } = useActor();

  return useQuery<CostItem[]>({
    queryKey: ['costItems'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllKostenpunkte();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetKostenUebersicht(projektId?: ProjectId | null) {
  const { actor, isFetching } = useActor();

  return useQuery<KostenUebersicht>({
    queryKey: ['kostenUebersicht', projektId],
    queryFn: async () => {
      if (!actor) return { gesamt: 0, bezahlt: 0, offen: 0 };
      return actor.getKostenUebersicht(projektId || null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddKostenpunkt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: ProjectId; costItem: CostItem }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.addKostenpunkt(params.projectId, params.costItem);
      }, 'Add cost item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error adding cost item: ${error.message}`);
    },
  });
}

export function useUpdateKostenpunkt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: ProjectId; kostId: CostItemId; updatedKost: CostItem }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.updateKostenpunkt(params.projectId, params.kostId, params.updatedKost);
      }, 'Update cost item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating cost item: ${error.message}`);
    },
  });
}

export function useDeleteKostenpunkt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: ProjectId; kostenpunktId: CostItemId }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.deleteKostenpunkt(params.projectId, params.kostenpunktId);
      }, 'Delete cost item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting cost item: ${error.message}`);
    },
  });
}

// Task Queries
export function useGetAllTasks() {
  const { actor, isFetching } = useActor();

  return useQuery<TaskV2[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTasksByStatus(status: string) {
  const { actor, isFetching } = useActor();

  return useQuery<TaskV2[]>({
    queryKey: ['tasks', status],
    queryFn: async () => {
      if (!actor) return [];
      const allTasks = await (actor as any).getAllTasks();
      return allTasks.filter((task: TaskV2) => task.status === status);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTasksByProjectId(projectId: ProjectId | null) {
  const { actor, isFetching } = useActor();

  return useQuery<TaskV2[]>({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async () => {
      if (!actor || !projectId) return [];
      return (actor as any).getTasksByProjectId(projectId);
    },
    enabled: !!actor && !isFetching && !!projectId,
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: TaskId;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: Bereich;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt?: ContactId | null;
      projectId?: ProjectId | null;
    }) => {
      if (!params.titel?.trim()) throw new Error('Title is required');
      if (!params.gewerke?.trim()) throw new Error('Trade is required');
      if (!params.bereich?.trim()) throw new Error('Area is required');
      if (!params.faelligkeit || params.faelligkeit <= 0) throw new Error('Due date is required');

      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        const result = await (actor as any).createTask(
          params.id,
          params.titel.trim(),
          params.beschreibung?.trim() || '',
          params.gewerke,
          params.status,
          params.dringlichkeit,
          params.bereich,
          params.faelligkeit,
          params.kategorie || 'Allgemein',
          params.verantwortlicherKontakt || null,
          params.projectId || null
        );
        if (!result) throw new Error('Task could not be created');
      }, 'Create task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error creating task: ${error.message}`);
    },
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: TaskId;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: Bereich;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt?: ContactId | null;
      projectId?: ProjectId | null;
    }) => {
      if (!params.titel?.trim()) throw new Error('Title is required');
      if (!params.gewerke?.trim()) throw new Error('Trade is required');
      if (!params.bereich?.trim()) throw new Error('Area is required');

      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).updateTask(
          params.id,
          params.titel.trim(),
          params.beschreibung?.trim() || '',
          params.gewerke,
          params.status,
          params.dringlichkeit,
          params.bereich,
          params.faelligkeit,
          params.kategorie || 'Allgemein',
          params.verantwortlicherKontakt || null,
          params.projectId || null
        );
      }, 'Update task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating task: ${error.message}`);
    },
  });
}

export function useChangeTaskStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: TaskId; newStatus: string }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        
        // Get the task first to preserve all fields
        const allTasks = await (actor as any).getAllTasks();
        const task = allTasks.find((t: TaskV2) => t.id === params.taskId);
        if (!task) throw new Error('Task not found');
        
        // Update with new status
        await (actor as any).updateTask(
          task.id,
          task.titel,
          task.beschreibung,
          task.gewerke,
          params.newStatus,
          task.dringlichkeit,
          task.bereich,
          task.faelligkeit,
          task.kategorie,
          task.verantwortlicherKontakt || null,
          task.projectId || null
        );
      }, 'Change status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating status: ${error.message}`);
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: TaskId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).deleteTask(id);
      }, 'Delete task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting task: ${error.message}`);
    },
  });
}

// Document Queries
export function useGetAllDocuments() {
  const { actor, isFetching } = useActor();

  return useQuery<Dokument[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserDocuments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      bereich: Bereich;
      typ: string;
      status: string;
      file: File;
      onProgress?: (percentage: number) => void;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        
        const arrayBuffer = await params.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let blob = ExternalBlob.fromBytes(uint8Array);
        if (params.onProgress) {
          blob = blob.withUploadProgress(params.onProgress);
        }
        
        await actor.uploadDocumentWithPDF(
          params.id,
          params.name,
          params.bereich,
          params.typ,
          params.status,
          blob
        );
      }, 'Upload document');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error uploading document: ${error.message}`);
    },
  });
}

export function useDeleteDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: DocumentId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).deleteDocument(id);
      }, 'Delete document');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting document: ${error.message}`);
    },
  });
}

// Media Queries
export function useGetAllMedia() {
  const { actor, isFetching } = useActor();

  return useQuery<Medium[]>({
    queryKey: ['media'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserMedia();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kategorie: string;
      typ: string;
      tags: string[];
      position: bigint;
      file: File;
      onProgress?: (percentage: number) => void;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        
        const arrayBuffer = await params.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let blob = ExternalBlob.fromBytes(uint8Array);
        if (params.onProgress) {
          blob = blob.withUploadProgress(params.onProgress);
        }
        
        await actor.uploadMedia(
          params.id,
          params.name,
          params.kategorie,
          params.typ,
          params.position,
          params.tags,
          blob
        );
      }, 'Upload media');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error uploading media: ${error.message}`);
    },
  });
}

export function useUpdateMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kategorie: string;
      typ: string;
      tags: string[];
      position: bigint;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        
        // Get existing media to preserve blob
        const allMedia = await actor.getUserMedia();
        const existingMedia = allMedia.find((m: Medium) => m.id === params.id);
        if (!existingMedia) throw new Error('Media not found');
        
        // Delete old media
        await actor.deleteUserMedia(params.id);
        
        // Re-upload with updated metadata
        await actor.uploadMedia(
          params.id,
          params.name,
          params.kategorie,
          params.typ,
          params.position,
          params.tags,
          existingMedia.blob
        );
      }, 'Update media');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating media: ${error.message}`);
    },
  });
}

export function useBulkUpdateMediaPositions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { updates: MediaPositionUpdate[] }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.bulkUpdateMediaPositions(params.updates);
      }, 'Update media positions');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (error: Error) => {
      toast.error(`Error updating positions: ${error.message}`);
    },
  });
}

export function useDeleteMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: MediaId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await actor.deleteUserMedia(id);
      }, 'Delete media');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting media: ${error.message}`);
    },
  });
}

// Contact Queries
export function useGetAllContacts() {
  const { actor, isFetching } = useActor();

  return useQuery<Kontakt[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllContacts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: ContactId;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).createContact(
          params.id,
          params.name,
          params.firma,
          params.rolle,
          params.email,
          params.telefon,
          params.notizen
        );
      }, 'Create contact');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error creating contact: ${error.message}`);
    },
  });
}

export function useUpdateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: ContactId;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).updateContact(
          params.id,
          params.name,
          params.firma,
          params.rolle,
          params.email,
          params.telefon,
          params.notizen
        );
      }, 'Update contact');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating contact: ${error.message}`);
    },
  });
}

export function useDeleteContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: ContactId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).deleteContact(id);
      }, 'Delete contact');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting contact: ${error.message}`);
    },
  });
}

// Helpful Links Queries
export function useGetAllLinks() {
  const { actor, isFetching } = useActor();

  return useQuery<HilfreicherLink[]>({
    queryKey: ['links'],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllLinks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: LinkId;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).createLink(
          params.id,
          params.titel,
          params.beschreibung,
          params.url,
          params.kategorie,
          params.logoUrl
        );
      }, 'Create link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error creating link: ${error.message}`);
    },
  });
}

export function useUpdateLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: LinkId;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).updateLink(
          params.id,
          params.titel,
          params.beschreibung,
          params.url,
          params.kategorie,
          params.logoUrl
        );
      }, 'Update link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error updating link: ${error.message}`);
    },
  });
}

export function useDeleteLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: LinkId) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).deleteLink(id);
      }, 'Delete link');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting link: ${error.message}`);
    },
  });
}

// Custom Categories
export function useCreateCustomCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { categoryType: string; categoryName: string }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).createCustomCategory(params.categoryType, params.categoryName);
      }, 'Create category');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCategories'] });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error creating category: ${error.message}`);
    },
  });
}

export function useDeleteCustomCategory() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { categoryType: string; categoryName: string }) => {
      await withActorRetry(actor, async () => {
        if (!actor) throw new Error('Actor not available');
        await (actor as any).deleteCustomCategory(params.categoryType, params.categoryName);
      }, 'Delete category');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customCategories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Error deleting category: ${error.message}`);
    },
  });
}

// Export types for use in components
export type { TaskV2, Dokument, Medium, Kontakt, HilfreicherLink, MediaFilterResult };
