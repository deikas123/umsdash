import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type DocumentStatus = Database['public']['Enums']['document_status'];

export interface Document {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  is_private: boolean;
  customer?: {
    id: string;
    account_number: string;
    full_name: string;
  } | null;
  category?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  uploader_name?: string | null;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  color: string | null;
}

export interface Customer {
  id: string;
  account_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  user_id: string | null;
}

interface UseDocumentsOptions {
  customerId?: string;
  categoryId?: string;
  status?: DocumentStatus;
  searchTerm?: string;
  limit?: number;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, customerId: userCustomerId, isCustomer } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          customer:customers(id, account_number, full_name),
          category:document_categories(id, name, color)
        `)
        .order('created_at', { ascending: false });

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId);
      } else if (isCustomer && userCustomerId) {
        query = query.eq('customer_id', userCustomerId);
      }

      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.searchTerm) {
        query = query.or(`title.ilike.%${options.searchTerm}%,file_name.ilike.%${options.searchTerm}%`);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const uploaderIds = [...new Set((data || []).map(d => d.uploaded_by).filter(Boolean))] as string[];
      let uploaderMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uploaderIds);
        if (profiles) {
          uploaderMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      const transformedData: Document[] = (data || []).map((doc) => ({
        id: doc.id,
        customer_id: doc.customer_id,
        category_id: doc.category_id,
        title: doc.title,
        description: doc.description,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
        status: doc.status,
        uploaded_by: doc.uploaded_by,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        is_private: doc.is_private ?? false,
        customer: doc.customer,
        category: doc.category,
        uploader_name: doc.uploaded_by ? uploaderMap[doc.uploaded_by] || null : null,
      }));

      setDocuments(transformedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, options.customerId, options.categoryId, options.status, options.searchTerm, options.limit, isCustomer, userCustomerId, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, error, refetch: fetchDocuments };
}

export function useCategories() {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('display_order');

      if (!error && data) {
        setCategories(data);
      }
      setLoading(false);
    }

    fetchCategories();
  }, []);

  return { categories, loading };
}

export function useCustomers(searchTerm?: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isAdmin, isStaff } = useAuth();

  const refetch = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    async function fetchCustomers() {
      if (!isAdmin && !isStaff) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('customers')
        .select('*')
        .order('full_name');

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,account_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(50);

      if (!error && data) {
        setCustomers(data);
      }
      setLoading(false);
    }

    fetchCustomers();
  }, [searchTerm, isAdmin, isStaff, refreshKey]);

  return { customers, loading, refetch };
}
