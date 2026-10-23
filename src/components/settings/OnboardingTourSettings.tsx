import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';

export function OnboardingTourSettings() {
  const { tours, progress, startTour, resetTour, isLoading } = useOnboardingTour();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Onboarding Tours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Onboarding Tours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tours.length === 0 && (
          <p className="text-sm text-muted-foreground">No tours available.</p>
        )}
        {tours.map((tour) => {
          const prog = progress[tour.key];
          const status = prog?.status;

          let badge: React.ReactNode;
          if (status === 'in_progress') {
            badge = <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">In Progress</Badge>;
          } else if (status === 'completed') {
            badge = <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
          } else if (status === 'dismissed') {
            badge = <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">Dismissed</Badge>;
          } else {
            badge = <Badge variant="secondary">Not Started</Badge>;
          }

          let actionLabel: string;
          let handleAction: () => void;
          if (status === 'in_progress') {
            actionLabel = 'Resume';
            handleAction = () => startTour(tour.key);
          } else if (status === 'completed' || status === 'dismissed') {
            actionLabel = 'Restart';
            handleAction = () => {
              resetTour(tour.key);
              // Small delay to allow the reset mutation to fire before starting
              setTimeout(() => startTour(tour.key), 150);
            };
          } else {
            actionLabel = 'Start';
            handleAction = () => startTour(tour.key);
          }

          return (
            <div
              key={tour.key}
              className="flex items-center justify-between rounded-lg border p-3 gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tour.name}</p>
                {tour.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{tour.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {badge}
                <Button variant="outline" size="sm" onClick={handleAction}>
                  {actionLabel}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
