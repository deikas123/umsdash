import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    { key: 'd', alt: true, description: 'Go to Dashboard', action: () => navigate('/docs') },
    { key: 'u', alt: true, description: 'Upload Document', action: () => navigate('/docs/upload') },
    { key: 'f', alt: true, description: 'All Documents', action: () => navigate('/docs/documents') },
    { key: 's', alt: true, description: 'Search', action: () => navigate('/search') },
    { key: 'c', alt: true, description: 'Customers', action: () => navigate('/customers') },
    { key: 't', alt: true, description: 'Tasks', action: () => navigate('/tasks') },
    { key: 'r', alt: true, description: 'Reminders', action: () => navigate('/reminders') },
    { key: 'p', alt: true, description: 'Private Folders', action: () => navigate('/folders') },
    { key: ',', alt: true, description: 'Settings', action: () => navigate('/docs/settings') },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcuts) {
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

      if (e.key.toLowerCase() === shortcut.key.toLowerCase() && altMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}
