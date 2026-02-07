import { useState, useMemo, useRef, useEffect } from 'react';
import { useGetAllMedia, useUploadMedia, useBulkUpdateMediaPositions, useDeleteMedia, useUpdateMedia } from '../hooks/useQueries';
import type { Medium } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Grid3x3, List, Image as ImageIcon, FileText, Upload, Eye, GripVertical, Trash2, X, Search, Edit, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DynamicSelect } from '../components/DynamicSelect';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { UnifiedPDFViewer } from '../components/UnifiedPDFViewer';
import { PDFThumbnail } from '../components/PDFThumbnail';
import { getMediaKategorien, addMediaKategorie } from '../lib/customCategories';
import { useQueryClient } from '@tanstack/react-query';

interface MediaItemProps {
  item: Medium;
  view: 'grid' | 'list';
  onView: (item: Medium) => void;
  onEdit: (item: Medium, e: React.MouseEvent) => void;
  onDelete: (item: Medium, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, item: Medium) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetItem: Medium) => void;
  isDragging: boolean;
}

function MediaItem({ item, view, onView, onEdit, onDelete, onDragStart, onDragOver, onDrop, isDragging }: MediaItemProps) {
  if (view === 'grid') {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, item)}
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <Card className="overflow-hidden hover:shadow-lg transition-shadow group relative">
          <div className="aspect-square bg-muted flex items-center justify-center relative">
            {item.typ === 'image' ? (
              <img 
                src={item.blob.getDirectURL()} 
                alt={item.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full"><svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                  }
                }}
              />
            ) : (
              <PDFThumbnail pdfUrl={item.blob.getDirectURL()} className="w-full h-full" />
            )}
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => onView(item)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={(e) => onEdit(item, e)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => onDelete(item, e)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-3">
            <p className="font-medium text-sm truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground truncate">{item.kategorie}</p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 2 && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    +{item.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, item)}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="p-2 rounded-lg bg-muted">
              {item.typ === 'image' ? (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.kategorie}</p>
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant="outline">{item.typ === 'image' ? 'Bild' : 'PDF'}</Badge>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onView(item)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={(e) => onEdit(item, e)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => onDelete(item, e)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Media() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: media = [], isLoading, isFetching: isRefetching } = useGetAllMedia();
  const uploadMedia = useUploadMedia();
  const updateMedia = useUpdateMedia();
  const bulkUpdatePositions = useBulkUpdateMediaPositions();
  const deleteMedia = useDeleteMedia();
  const queryClient = useQueryClient();
  const [kategorien, setKategorien] = useState<string[]>(getMediaKategorien());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<'all' | 'images' | 'pdfs'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [draggedItem, setDraggedItem] = useState<Medium | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Medium | null>(null);
  const [mediaToEdit, setMediaToEdit] = useState<Medium | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPdfUrl, setViewerPdfUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState('');
  const [imageViewerTitle, setImageViewerTitle] = useState('');
  const [newMedia, setNewMedia] = useState({
    kategorie: 'none',
    tags: '',
    note: '',
  });
  const [editMedia, setEditMedia] = useState({
    name: '',
    kategorie: 'none',
    tags: '',
    note: '',
  });

  const editTagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditOpen && editTagsInputRef.current) {
      setTimeout(() => {
        editTagsInputRef.current?.focus();
      }, 100);
    }
  }, [isEditOpen]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    media.forEach(item => {
      if (item.kategorie) cats.add(item.kategorie);
    });
    return ['Alle', ...Array.from(cats).sort()];
  }, [media]);

  const filteredMedia = useMemo(() => {
    let result = [...media];

    if (typeFilter === 'images') {
      result = result.filter(item => item.typ === 'image');
    } else if (typeFilter === 'pdfs') {
      result = result.filter(item => item.typ === 'pdf');
    }

    if (categoryFilter !== 'Alle') {
      result = result.filter(item => item.kategorie === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return result;
  }, [media, typeFilter, categoryFilter, searchQuery]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (categoryFilter !== 'Alle') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [typeFilter, categoryFilter, searchQuery]);

  const isActorInitializing = !actor && actorFetching;
  const isUploadDisabled = isActorInitializing || uploadMedia.isPending;

  const handleDragStart = (e: React.DragEvent, item: Medium) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetItem: Medium) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    // CRITICAL FIX: Operate on full media collection, not filteredMedia
    const sortedMedia = [...media].sort((a, b) => Number(a.position) - Number(b.position));
    
    const oldIndex = sortedMedia.findIndex((item) => item.id === draggedItem.id);
    const newIndex = sortedMedia.findIndex((item) => item.id === targetItem.id);

    if (oldIndex === -1 || newIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Create new order
    const newOrder = [...sortedMedia];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    // CRITICAL FIX: Optimistically update the cache
    queryClient.setQueryData(['media'], newOrder.map((item, index) => ({
      ...item,
      position: BigInt(index)
    })));

    try {
      // CRITICAL FIX: Build MediaPositionUpdate array with correct structure
      const updates = newOrder.map((item, index) => ({
        mediaId: item.id,
        newPosition: BigInt(index)
      }));

      await bulkUpdatePositions.mutateAsync({ updates });
    } catch (error) {
      console.error('Error updating positions:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.error('Fehler beim Aktualisieren der Reihenfolge');
    }

    setDraggedItem(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        toast.error(`${file.name}: Nur Bilder und PDFs sind erlaubt`);
        return false;
      }
      return true;
    });
    setSelectedFiles(validFiles);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!actor) {
      toast.error('Backend-Verbindung wird initialisiert. Bitte warten Sie einen Moment.');
      return;
    }

    if (selectedFiles.length === 0 || !newMedia.kategorie || newMedia.kategorie === 'none') {
      toast.error('Bitte wählen Sie Dateien und eine Kategorie aus');
      return;
    }

    try {
      const currentMediaCount = media?.length || 0;
      const tags = newMedia.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const mediaId = `media_${Date.now()}_${i}`;
        const isImage = file.type.startsWith('image/');
        
        await uploadMedia.mutateAsync({
          id: mediaId,
          name: file.name,
          kategorie: newMedia.kategorie,
          typ: isImage ? 'image' : 'pdf',
          tags: tags,
          position: BigInt(currentMediaCount + i),
          file: file,
          onProgress: (percentage) => {
            const totalProgress = ((i / selectedFiles.length) * 100) + (percentage / selectedFiles.length);
            setUploadProgress(Math.round(totalProgress));
          },
        });
      }

      setNewMedia({ kategorie: 'none', tags: '', note: '' });
      setSelectedFiles([]);
      setUploadProgress(0);
      setIsUploadOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
    }
  };

  const handleEditClick = (item: Medium, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaToEdit(item);
    setEditMedia({
      name: item.name,
      kategorie: item.kategorie,
      tags: item.tags?.join(', ') || '',
      note: '',
    });
    setIsEditOpen(true);
  };

  const handleUpdateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaToEdit) return;

    const tags = editMedia.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    try {
      await updateMedia.mutateAsync({
        id: mediaToEdit.id,
        name: editMedia.name,
        kategorie: editMedia.kategorie,
        typ: mediaToEdit.typ,
        tags: tags,
        position: mediaToEdit.position,
      });

      setMediaToEdit(null);
      setEditMedia({ name: '', kategorie: 'none', tags: '', note: '' });
      setIsEditOpen(false);
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleViewMedia = async (item: Medium) => {
    try {
      if (item.typ === 'pdf') {
        const response = await fetch(item.blob.getDirectURL(), {
          headers: {
            'Accept': 'application/pdf',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setViewerPdfUrl(url);
        setViewerTitle(item.name);
        setViewerOpen(true);
      } else {
        const url = item.blob.getDirectURL();
        setImageViewerUrl(url);
        setImageViewerTitle(item.name);
        setImageViewerOpen(true);
      }
    } catch (error) {
      console.error('Error viewing media:', error);
      toast.error('Fehler beim Öffnen der Datei');
    }
  };

  const handleDeleteClick = (item: Medium, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mediaToDelete) return;
    
    try {
      await deleteMedia.mutateAsync(mediaToDelete.id);
      setMediaToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAddKategorie = (newKategorie: string) => {
    addMediaKategorie(newKategorie);
    setKategorien(getMediaKategorien());
  };

  const handleResetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('Alle');
    setSearchQuery('');
  };

  const handleRetryConnection = () => {
    window.location.reload();
  };

  const showRefreshIndicator = isRefetching && !isLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medien</h1>
          <p className="text-muted-foreground mt-2">
            Bilder, PDFs und Visualisierungen Ihrer Projekte
          </p>
        </div>
        <div className="flex gap-2">
          {!actor && !actorFetching && (
            <Button variant="outline" onClick={handleRetryConnection} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Neu laden
            </Button>
          )}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button disabled={isUploadDisabled}>
                {isActorInitializing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Initialisierung...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Medien hochladen
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Medien hochladen</DialogTitle>
                <DialogDescription>
                  Laden Sie Bilder oder PDF-Dateien hoch
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="files">Dateien auswählen *</Label>
                  <Input
                    id="files"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                    required
                    disabled={isUploadDisabled}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedFiles.map((file, idx) => (
                        <Badge key={idx} variant="secondary">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <DynamicSelect
                  id="kategorie"
                  label="Kategorie"
                  value={newMedia.kategorie}
                  onValueChange={(value) => setNewMedia({ ...newMedia, kategorie: value })}
                  options={kategorien}
                  onAddOption={handleAddKategorie}
                  placeholder="Kategorie wählen..."
                  required
                  disabled={isUploadDisabled}
                />
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (kommagetrennt)</Label>
                  <Input
                    id="tags"
                    value={newMedia.tags}
                    onChange={(e) => setNewMedia({ ...newMedia, tags: e.target.value })}
                    placeholder="z.B. Fassade, Vorher, 2024"
                    disabled={isUploadDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Notiz (optional)</Label>
                  <Textarea
                    id="note"
                    value={newMedia.note}
                    onChange={(e) => setNewMedia({ ...newMedia, note: e.target.value })}
                    placeholder="Kurze Beschreibung..."
                    rows={2}
                    disabled={isUploadDisabled}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Upload-Fortschritt</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)} disabled={uploadMedia.isPending}>
                    Abbrechen
                  </Button>
                  <Button type="submit" disabled={selectedFiles.length === 0 || isUploadDisabled}>
                    {uploadMedia.isPending ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-pulse" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Hochladen ({selectedFiles.length})
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showRefreshIndicator && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Aktualisiere Medienliste...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filter & Suche</h3>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-2" />
                Alle zurücksetzen ({activeFiltersCount})
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Name oder Tags suchen</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Suche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Kategorie</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Dateityp</Label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="images">Nur Bilder</SelectItem>
                  <SelectItem value="pdfs">Nur PDFs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Aktive Filter:</span>
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Typ: {typeFilter === 'images' ? 'Bilder' : 'PDFs'}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setTypeFilter('all')}
                  />
                </Badge>
              )}
              {categoryFilter !== 'Alle' && (
                <Badge variant="secondary" className="gap-1">
                  Kategorie: {categoryFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setCategoryFilter('Alle')}
                  />
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="secondary" className="gap-1">
                  Suche: "{searchQuery}"
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">
              Alle
              {media && <Badge variant="secondary" className="ml-2">{filteredMedia.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="images">
              <ImageIcon className="h-4 w-4 mr-2" />
              Bilder
            </TabsTrigger>
            <TabsTrigger value="pdfs">
              <FileText className="h-4 w-4 mr-2" />
              PDFs
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <Button
            variant={view === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className={view === 'grid' ? 'h-48' : 'h-20'} />
          ))}
        </div>
      ) : filteredMedia && filteredMedia.length > 0 ? (
        <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredMedia.map((item) => (
            <MediaItem
              key={item.id}
              item={item}
              view={view}
              onView={handleViewMedia}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragging={draggedItem?.id === item.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              {activeFiltersCount > 0 
                ? 'Keine Medien entsprechen den aktuellen Filtern.'
                : 'Noch keine Medien vorhanden. Laden Sie Ihre ersten Dateien hoch.'}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Medium bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Mediendetails
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMedia} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editMedia.name}
                onChange={(e) => setEditMedia({ ...editMedia, name: e.target.value })}
                required
              />
            </div>
            <DynamicSelect
              id="edit-kategorie"
              label="Kategorie"
              value={editMedia.kategorie}
              onValueChange={(value) => setEditMedia({ ...editMedia, kategorie: value })}
              options={kategorien}
              onAddOption={handleAddKategorie}
              placeholder="Kategorie wählen..."
              required
            />
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (kommagetrennt)</Label>
              <Input
                ref={editTagsInputRef}
                id="edit-tags"
                value={editMedia.tags}
                onChange={(e) => setEditMedia({ ...editMedia, tags: e.target.value })}
                placeholder="z.B. Fassade, Vorher, 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note">Notiz (optional)</Label>
              <Textarea
                id="edit-note"
                value={editMedia.note}
                onChange={(e) => setEditMedia({ ...editMedia, note: e.target.value })}
                placeholder="Kurze Beschreibung..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={updateMedia.isPending}>
                {updateMedia.isPending ? 'Wird aktualisiert...' : 'Aktualisieren'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <UnifiedPDFViewer
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open && viewerPdfUrl) {
            URL.revokeObjectURL(viewerPdfUrl);
            setViewerPdfUrl('');
          }
        }}
        pdfUrl={viewerPdfUrl}
        title={viewerTitle}
        disableDownload={true}
      />

      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-4">{imageViewerTitle}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => setImageViewerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-6">
            <img 
              src={imageViewerUrl} 
              alt={imageViewerTitle}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                toast.error('Bild konnte nicht geladen werden');
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Medium löschen"
        description="Möchten Sie dieses Medium wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={mediaToDelete?.name}
      />
    </div>
  );
}
