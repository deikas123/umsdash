import { useState, useEffect } from 'react';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SmsBanner() {
  const { prefs, loading } = useSmsPreferences();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `sms_banner_dismissed_${user?.id}`;
    if (localStorage.getItem(key)) setDismissed(true);
  }, [user?.id]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`sms_banner_dismissed_${user?.id}`, 'true');
  };

  if (loading || dismissed) return null;
  if (prefs?.sms_enabled && prefs?.phone_number) return null;

  return (
    <Alert className="mb-4 border-primary/30 bg-primary/5">
      <MessageSquare className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm">
          <strong>Stay notified!</strong> Set up your phone number and SMS preferences to receive task and reminder alerts.
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="default" asChild>
            <Link to="/settings">Set Up SMS</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
