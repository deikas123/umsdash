import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Users() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin/users', { replace: true }); }, [navigate]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-muted-foreground">Redirecting to User Hub…</p>
      <Button onClick={() => navigate('/admin/users')}>Go to User Hub</Button>
    </div>
  );
}
