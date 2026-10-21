import { usePasswordExpiry } from '@/hooks/usePasswordExpiry';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PasswordExpiryBanner() {
  const { isExpired, isWarning, daysUntilExpiry } = usePasswordExpiry();
  const navigate = useNavigate();

  if (!isExpired && !isWarning) return null;

  return (
    <Alert variant={isExpired ? 'destructive' : 'default'} className="mx-3 mt-3 sm:mx-4 lg:mx-6">
      {isExpired ? (
        <ShieldAlert className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <span>
          {isExpired
            ? 'Your password has expired. Please set a new one to continue.'
            : daysUntilExpiry === 0
              ? 'Your password expires today. Please update it now.'
              : `Your password expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Please update it soon.`}
        </span>
        <Button
          size="sm"
          variant={isExpired ? 'destructive' : 'outline'}
          onClick={() => navigate('/settings')}
        >
          Change Password
        </Button>
      </AlertDescription>
    </Alert>
  );
}
