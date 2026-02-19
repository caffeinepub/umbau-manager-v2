import { useEffect, useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useClaimInviteToken } from '../hooks/useQueries';
import { getUrlParameter, clearUrlParameter } from '../utils/urlParams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ApplyInviteProps {
  onSuccess: () => void;
}

export default function ApplyInvite({ onSuccess }: ApplyInviteProps) {
  const { identity, login, isInitializing } = useInternetIdentity();
  const claimInviteToken = useClaimInviteToken();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'claiming' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const token = getUrlParameter('invite');
    if (token) {
      setInviteToken(token);
    } else {
      setStatus('error');
      setErrorMessage('Kein Einladungstoken gefunden');
    }
  }, []);

  useEffect(() => {
    if (!inviteToken || !identity || status !== 'pending') return;

    const claimToken = async () => {
      setStatus('claiming');
      try {
        await claimInviteToken.mutateAsync(inviteToken);
        clearUrlParameter('invite');
        setStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } catch (error: any) {
        console.error('Claim invite error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Ungültiger oder abgelaufener Einladungslink');
        clearUrlParameter('invite');
      }
    };

    claimToken();
  }, [inviteToken, identity, status, claimInviteToken, onSuccess]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="text-muted-foreground">Wird geladen...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Team-Einladung</CardTitle>
            <CardDescription>
              Sie wurden eingeladen, einem Team beizutreten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bitte melden Sie sich an, um die Einladung anzunehmen.
            </p>
            <Button onClick={login} className="w-full">
              Anmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Team-Einladung</CardTitle>
          <CardDescription>
            {status === 'claiming' && 'Einladung wird verarbeitet...'}
            {status === 'success' && 'Einladung erfolgreich angenommen'}
            {status === 'error' && 'Fehler beim Annehmen der Einladung'}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            {status === 'claiming' && (
              <>
                <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground">
                  Ihre Einladung wird verarbeitet...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
                <div className="space-y-2">
                  <p className="font-medium text-lg">Willkommen im Team!</p>
                  <p className="text-sm text-muted-foreground">
                    Sie werden in Kürze weitergeleitet...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive" />
                <div className="space-y-2">
                  <p className="font-medium text-lg">Fehler</p>
                  <p className="text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
                <Button onClick={onSuccess} variant="outline" className="mt-4">
                  Zur Startseite
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
