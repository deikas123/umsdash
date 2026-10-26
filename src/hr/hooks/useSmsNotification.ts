import { supabase } from '@/integrations/supabase/client';

export async function sendSmsNotification(mobile: string, message: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { mobile, message },
    });
    if (error) throw error;
    console.log('SMS sent:', data);
    return data;
  } catch (err) {
    console.error('SMS notification failed:', err);
    // Don't throw - SMS failure shouldn't block workflows
    return null;
  }
}
