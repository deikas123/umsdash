import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, ListTodo, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const actions = [
  { label: 'Upload Document', icon: Upload, href: '/docs/upload' },
  { label: 'New Task', icon: ListTodo, href: '/docs/tasks' },
  { label: 'New Reminder', icon: Bell, href: '/docs/reminders' },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isCustomer } = useAuth();

  // Hidden for customer role
  if (isCustomer) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 md:bottom-6 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open &&
          actions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs bg-popover text-popover-foreground rounded-md px-2 py-1 shadow-md border">
                {action.label}
              </span>
              <Button
                size="icon"
                variant="secondary"
                className="h-10 w-10 rounded-full shadow-md"
                onClick={() => {
                  navigate(action.href);
                  setOpen(false);
                }}
                aria-label={action.label}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
      </AnimatePresence>
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus className="h-5 w-5" />
        </motion.div>
      </Button>
    </div>
  );
}
