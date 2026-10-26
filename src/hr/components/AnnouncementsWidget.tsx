import { useActiveAnnouncements } from '@/hr/hooks/useAnnouncements';
import { useMyReadAnnouncementIds, useMarkAnnouncementRead } from '@/hr/hooks/useAnnouncementReads';
import { Megaphone, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AnnouncementsWidget() {
  const { data: announcements = [] } = useActiveAnnouncements(3);
  const { data: readIds } = useMyReadAnnouncementIds();
  const markRead = useMarkAnnouncementRead();
  const unreadCount = announcements.filter(a => !readIds?.has(a.id)).length;

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Announcements
          {unreadCount > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">{unreadCount} new</span>}
        </h2>
        <Link to="/announcements" className="text-xs text-primary hover:underline">View all →</Link>
      </div>
      <div className="p-4 space-y-3">
        {announcements.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 text-sm">No active announcements.</p>
        ) : announcements.map(a => {
          const isUnread = !readIds?.has(a.id);
          return (
            <Link
              key={a.id}
              to="/announcements"
              onClick={() => { if (isUnread) markRead.mutate(a.id); }}
              className={`block p-3 rounded-md border transition-colors hover:border-primary ${a.pinned ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'} ${isUnread ? 'ring-1 ring-primary/30' : ''}`}
            >
              <div className="flex items-start gap-2">
                {a.pinned && <Pin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground flex-1 min-w-0">{a.title}</p>
                    {isUnread && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold shrink-0">NEW</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(a.published_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}