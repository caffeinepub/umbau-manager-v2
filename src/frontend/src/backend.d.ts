import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserProfile {
    userType: UserType;
    name: string;
    role: string;
    email: string;
}
export type Time = bigint;
export interface Document {
    id: DocumentId;
    typ: string;
    status: string;
    bereich: Bereich;
    owner: Principal;
    blob: ExternalBlob;
    name: string;
}
export interface MediaPositionUpdate {
    newPosition: bigint;
    mediaId: MediaId;
}
export type CostItemId = string;
export type Bereich = string;
export type DocumentId = string;
export type ProjectId = string;
export interface CostItem {
    id: CostItemId;
    status: string;
    owner: Principal;
    dokumentId?: DocumentId;
    projektId: ProjectId;
    betrag: number;
    kategorie: string;
    beschreibung: string;
    datum: Time;
    handwerker?: string;
}
export type ContactId = string;
export interface Project {
    id: ProjectId;
    endDate?: Time;
    owner: Principal;
    name: string;
    color: string;
    verantwortlicherKontakt?: ContactId;
    kategorie: string;
    kunde: string;
    startDate?: Time;
}
export interface KostenUebersicht {
    offen: number;
    gesamt: number;
    bezahlt: number;
}
export type MediaId = string;
export interface Media {
    id: MediaId;
    typ: string;
    owner: Principal;
    blob: ExternalBlob;
    name: string;
    tags: Array<string>;
    kategorie: string;
    position: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum UserType {
    business = "business",
    privat = "privat"
}
export interface backendInterface {
    addKostenpunkt(projectId: ProjectId, kost: CostItem): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkUpdateMediaPositions(updates: Array<MediaPositionUpdate>): Promise<void>;
    createProjekt(id: ProjectId, name: string, kunde: string | null, color: string, start: Time | null, end: Time | null, kategorie: string, verantwortlicherKontakt: ContactId | null, costItemsArray: Array<CostItem>): Promise<void>;
    deleteKostenpunkt(projectId: ProjectId, kostenpunktId: CostItemId): Promise<void>;
    deleteProjekt(id: ProjectId): Promise<void>;
    deleteUserMedia(mediaId: string): Promise<void>;
    filterProjectsByUserType(userType: UserType): Promise<Array<Project>>;
    getAllKostenpunkte(): Promise<Array<CostItem>>;
    getAllProjects(): Promise<Array<Project>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getKostenUebersicht(projektId: ProjectId | null): Promise<KostenUebersicht>;
    getKostenpunkteByProjekt(projectId: ProjectId): Promise<Array<CostItem>>;
    getProjekt(id: ProjectId): Promise<Project>;
    getUserDocuments(): Promise<Array<Document>>;
    getUserMedia(): Promise<Array<Media>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateKostenpunkt(projectId: ProjectId, kostId: CostItemId, updatedKost: CostItem): Promise<void>;
    updateProjekt(id: ProjectId, name: string, kunde: string | null, color: string, start: Time | null, end: Time | null, kategorie: string, verantwortlicherKontakt: ContactId | null, costItemsArray: Array<CostItem>): Promise<void>;
    uploadDocumentWithPDF(id: string, name: string, bereich: Bereich, typ: string, status: string, blob: ExternalBlob): Promise<void>;
    uploadMedia(id: string, name: string, kategorie: string, typ: string, position: bigint, tags: Array<string>, blob: ExternalBlob): Promise<void>;
}
