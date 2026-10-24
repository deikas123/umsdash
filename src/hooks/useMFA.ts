import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MFAFactor {
  id: string;
  factor_type: 'totp';
  friendly_name?: string;
  status: 'verified' | 'unverified';
}

export function useMFA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFactors = useCallback(async (): Promise<MFAFactor[]> => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return [];
    return (data?.all ?? []) as unknown as MFAFactor[];
  }, []);

  const enroll = useCallback(async (friendlyName?: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName });
      if (error) throw error;
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enroll failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const challenge = useCallback(async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
  }, []);

  const verify = useCallback(async (factorId: string, challengeId: string, code: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verify failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const challengeAndVerify = useCallback(async (factorId: string, code: string) => {
    setLoading(true); setError(null);
    try {
      const ch = await challenge(factorId);
      const result = await verify(factorId, ch.id, code);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'MFA failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [challenge, verify]);

  const unenroll = useCallback(async (factorId: string) => {
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unenroll failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, listFactors, enroll, challenge, verify, challengeAndVerify, unenroll };
}
