import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import type { Task, Project, Document, Media, MediaPositionUpdate, MediaUpdate, CostItem, UserProfile, UserType, KostenUebersicht } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

// ============================================================================
// Type Definitions
// ============================================================================

export type Kontakt = {
  id: string;
  name: string;
  firma: string;
  rolle: string;
  email: string;
  telefon: string;
  notizen: string;
  verknuepfteTasks: string[];
  verknuepfteDokumente: string[];
  owner: Principal;
};

export type HilfreicherLink = {
  id: string;
  titel: string;
  beschreibung: string;
  url: string;
  kategorie: string;
  logoUrl: string;
  owner: Principal;
};

// Aliases for backward compatibility
export type Dokument = Document;
export type Medium = Media;

// ============================================================================
// User Profile Queries
// ============================================================================

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
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      console.error('Save profile error:', error);
      toast.error('Failed to save profile');
    },
  });
}

// ============================================================================
// Task Queries
// ============================================================================

export function useGetAllTasks() {
  const { actor, isFetching } = useActor();

  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: string;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      projectId: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createTask(
        params.id,
        params.titel,
        params.beschreibung,
        params.gewerke,
        params.status,
        params.dringlichkeit,
        params.bereich,
        params.faelligkeit,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.projectId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: Error) => {
      console.error('Create task error:', error);
      toast.error('Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: string;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      projectId: string | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateTask(
        params.id,
        params.titel,
        params.beschreibung,
        params.gewerke,
        params.status,
        params.dringlichkeit,
        params.bereich,
        params.faelligkeit,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.projectId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update task error:', error);
      toast.error('Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete task error:', error);
      toast.error('Failed to delete task');
    },
  });
}

export function useChangeTaskStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      if (!actor) throw new Error('Actor not available');
      const task = await actor.getTask(taskId);
      await actor.updateTask(
        taskId,
        task.titel,
        task.beschreibung,
        task.gewerke,
        newStatus,
        task.dringlichkeit,
        task.bereich,
        task.faelligkeit,
        task.kategorie,
        task.verantwortlicherKontakt || null,
        task.projectId || null
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    },
    onError: (error: Error) => {
      console.error('Change task status error:', error);
      toast.error('Failed to update task status');
    },
  });
}

// ============================================================================
// Project Queries
// ============================================================================

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
      id: string;
      name: string;
      kunde: string | null;
      color: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      costItems: CostItem[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createProjekt(
        params.id,
        params.name,
        params.kunde,
        params.color,
        params.start,
        params.end,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.costItems
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    },
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kunde: string | null;
      color: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      costItems: CostItem[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateProjekt(
        params.id,
        params.name,
        params.kunde,
        params.color,
        params.start,
        params.end,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.costItems
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update project error:', error);
      toast.error('Failed to update project');
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteProjekt(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete project error:', error);
      toast.error('Failed to delete project');
    },
  });
}

// ============================================================================
// Contact Queries
// ============================================================================

export function useGetAllContacts() {
  const { actor, isFetching } = useActor();

  return useQuery<Kontakt[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllContacts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createContact(
        params.id,
        params.name,
        params.firma,
        params.rolle,
        params.email,
        params.telefon,
        params.notizen,
        [], // verknuepfteTasks
        []  // verknuepfteDokumente
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt erfolgreich erstellt');
    },
    onError: (error: Error) => {
      console.error('Create contact error:', error);
      toast.error('Fehler beim Erstellen des Kontakts');
    },
  });
}

export function useUpdateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      // Get existing contact to preserve linked tasks and documents
      const existingContact = await actor.getContact(params.id);
      await actor.updateContact(
        params.id,
        params.name,
        params.firma,
        params.rolle,
        params.email,
        params.telefon,
        params.notizen,
        existingContact.verknuepfteTasks,
        existingContact.verknuepfteDokumente
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      console.error('Update contact error:', error);
      toast.error('Fehler beim Aktualisieren des Kontakts');
    },
  });
}

export function useDeleteContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteContact(contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Kontakt erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      console.error('Delete contact error:', error);
      toast.error('Fehler beim Löschen des Kontakts');
    },
  });
}

// ============================================================================
// Helpful Link Queries
// ============================================================================

export function useGetAllLinks() {
  const { actor, isFetching } = useActor();

  return useQuery<HilfreicherLink[]>({
    queryKey: ['links'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllHelpfulLinks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createHelpfulLink(
        params.id,
        params.titel,
        params.beschreibung,
        params.url,
        params.kategorie,
        params.logoUrl
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link erfolgreich erstellt');
    },
    onError: (error: Error) => {
      console.error('Create link error:', error);
      toast.error('Fehler beim Erstellen des Links');
    },
  });
}

export function useUpdateLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateHelpfulLink(
        params.id,
        params.titel,
        params.beschreibung,
        params.url,
        params.kategorie,
        params.logoUrl
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      console.error('Update link error:', error);
      toast.error('Fehler beim Aktualisieren des Links');
    },
  });
}

export function useDeleteLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteHelpfulLink(linkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast.success('Link erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      console.error('Delete link error:', error);
      toast.error('Fehler beim Löschen des Links');
    },
  });
}

// ============================================================================
// Document Queries
// ============================================================================

export function useGetUserDocuments() {
  const { actor, isFetching } = useActor();

  return useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserDocuments();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllDocuments = useGetUserDocuments;

export function useUploadDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      bereich: string;
      typ: string;
      status: string;
      blob: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.uploadDocumentWithPDF(params.id, params.name, params.bereich, params.typ, params.status, params.blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      console.error('Upload document error:', error);
      toast.error('Failed to upload document');
    },
  });
}

export function useDeleteDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteDocument(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete document error:', error);
      toast.error('Failed to delete document');
    },
  });
}

// ============================================================================
// Media Queries
// ============================================================================

export function useGetUserMedia() {
  const { actor, isFetching } = useActor();

  return useQuery<Media[]>({
    queryKey: ['media'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserMedia();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllMedia = useGetUserMedia;

export function useUploadMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kategorie: string;
      typ: string;
      position: bigint;
      tags: string[];
      blob: any;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.uploadMedia(params.id, params.name, params.kategorie, params.typ, params.position, params.tags, params.blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media uploaded successfully');
    },
    onError: (error: Error) => {
      console.error('Upload media error:', error);
      toast.error('Failed to upload media');
    },
  });
}

export function useUpdateMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; updates: MediaUpdate }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateMedia(params.id, params.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update media error:', error);
      toast.error('Failed to update media');
    },
  });
}

export function useDeleteMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteUserMedia(mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete media error:', error);
      toast.error('Failed to delete media');
    },
  });
}

export function useBulkUpdateMediaPositions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: MediaPositionUpdate[]) => {
      if (!actor) throw new Error('Actor not available');
      await actor.bulkUpdateMediaPositions(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media positions updated');
    },
    onError: (error: Error) => {
      console.error('Bulk update media positions error:', error);
      toast.error('Failed to update media positions');
    },
  });
}

// ============================================================================
// Cost Item Queries
// ============================================================================

export function useGetAllCostItems() {
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

// Alias for backward compatibility
export const useGetAllKostenpunkte = useGetAllCostItems;

export function useGetKostenUebersicht(projektId?: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<KostenUebersicht>({
    queryKey: ['kostenUebersicht', projektId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getKostenUebersicht(projektId || null);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; costItem: CostItem }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addKostenpunkt(params.projectId, params.costItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item added successfully');
    },
    onError: (error: Error) => {
      console.error('Add cost item error:', error);
      toast.error('Failed to add cost item');
    },
  });
}

// Alias for backward compatibility
export const useAddKostenpunkt = useAddCostItem;

export function useUpdateCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; kostId: string; updatedKost: CostItem }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateKostenpunkt(params.projectId, params.kostId, params.updatedKost);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update cost item error:', error);
      toast.error('Failed to update cost item');
    },
  });
}

// Alias for backward compatibility
export const useUpdateKostenpunkt = useUpdateCostItem;

export function useDeleteCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; kostenpunktId: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteKostenpunkt(params.projectId, params.kostenpunktId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costItems'] });
      queryClient.invalidateQueries({ queryKey: ['kostenUebersicht'] });
      toast.success('Cost item deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Delete cost item error:', error);
      toast.error('Failed to delete cost item');
    },
  });
}

// Alias for backward compatibility
export const useDeleteKostenpunkt = useDeleteCostItem;
