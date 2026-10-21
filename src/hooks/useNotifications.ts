import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';

export function useNotifications() {
  const { user } = useAuth();
  const { reminders } = useReminders();
  const { tasks } = useTasks();
  const { playSound } = useNotificationSound();
  const { prefs, sendSms } = useSmsPreferences();
  const notifiedIds = useRef<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, type: 'task' | 'reminder' | 'alert', id: string) => {
    if (notifiedIds.current.has(id)) return;
    notifiedIds.current.add(id);

    playSound(type);

    // Browser notification
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
      } catch { }
    }

    // SMS notification
    if (prefs?.sms_enabled && prefs.phone_number) {
      const shouldSendSms =
        (type === 'reminder' && prefs.notify_reminders) ||
        (type === 'alert' && prefs.notify_reminders) ||
        (type === 'task' && prefs.notify_tasks);

      if (shouldSendSms) {
        sendSms(prefs.phone_number, `${title}: ${body}`, type);
      }
    }
  }, [playSound, prefs, sendSms]);

  useEffect(() => {
    if (!user) return;
    requestPermission();

    const checkReminders = () => {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      reminders
        .filter(r => r.status === 'pending')
        .forEach(r => {
          const reminderDate = new Date(r.reminder_date);
          if (reminderDate > now && reminderDate <= fiveMinutesFromNow) {
            sendNotification('Reminder', `${r.title} is due soon`, 'reminder', `reminder-soon-${r.id}`);
          }
          if (reminderDate <= now && reminderDate > new Date(now.getTime() - 60 * 1000)) {
            sendNotification('Reminder Due', `${r.title} is now due`, 'alert', `reminder-due-${r.id}`);
          }
        });
    };

    const checkTasks = () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      tasks
        .filter(t => t.status !== 'completed' && t.due_date)
        .forEach(t => {
          const dueDate = new Date(t.due_date!);
          if (dueDate > now && dueDate <= oneHourFromNow) {
            sendNotification('Task Due Soon', `${t.title} is due within an hour`, 'task', `task-due-${t.id}`);
          }
        });
    };

    checkReminders();
    checkTasks();

    const interval = setInterval(() => {
      checkReminders();
      checkTasks();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, reminders, tasks, requestPermission, sendNotification]);

  return { requestPermission };
}
