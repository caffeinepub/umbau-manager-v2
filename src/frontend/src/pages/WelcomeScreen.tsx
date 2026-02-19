import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreateFamily, useJoinFamily } from '../hooks/useQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Plus, Link2, LogOut } from 'lucide-react';
import JoinFamilyDialog from '../components/JoinFamilyDialog';

export default function WelcomeScreen() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const createFamily = useCreateFamily();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  const handleCreateFamily = async () => {
    try {
      await createFamily.mutateAsync();
      // The mutation will invalidate queries and trigger a re-render
    } catch (error) {
      console.error('Create family error:', error);
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-12 pb-8 px-8">
          {/* App Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-md">
              <Home className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Willkommen bei FamilyHub</h1>
            <p className="text-muted-foreground text-sm">
              Beginnen Sie, indem Sie eine neue Familie erstellen oder einer bestehenden beitreten.
            </p>
          </div>

          {/* Create Family Button */}
          <Button
            onClick={handleCreateFamily}
            disabled={createFamily.isPending}
            className="w-full h-auto py-4 mb-3"
            size="lg"
          >
            <div className="flex items-start gap-3 w-full">
              <Plus className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold">Neue Familie erstellen</div>
                <div className="text-xs opacity-90 font-normal">
                  {createFamily.isPending ? 'Wird erstellt...' : 'Neu starten als Familienadministrator'}
                </div>
              </div>
            </div>
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">oder</span>
            </div>
          </div>

          {/* Join Family Button */}
          <Button
            onClick={() => setIsJoinDialogOpen(true)}
            variant="outline"
            className="w-full h-auto py-4"
            size="lg"
          >
            <div className="flex items-start gap-3 w-full">
              <Link2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-semibold">Bestehender Familie beitreten</div>
                <div className="text-xs text-muted-foreground font-normal">
                  Verwenden Sie einen Einladungscode Ihrer Familie
                </div>
              </div>
            </div>
          </Button>

          {/* Logout Link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Join Family Dialog */}
      <JoinFamilyDialog
        open={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
      />
    </div>
  );
}
