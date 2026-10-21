import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StorageBreakdownItem {
  name: string;
  bytes: number;
}

interface DashboardStats {
  totalDocuments: number;
  totalCustomers: number;
  totalUsers: number;
  pendingDocuments: number;
  recentUploads: number;
  totalStorageBytes: number;
  storageByCategory: StorageBreakdownItem[];
  storageByCustomer: StorageBreakdownItem[];
  documentsByCategory: { name: string; count: number }[];
}

export function useStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalCustomers: 0,
    totalUsers: 0,
    pendingDocuments: 0,
    recentUploads: 0,
    totalStorageBytes: 0,
    storageByCategory: [],
    storageByCustomer: [],
    documentsByCategory: [],
  });
  const [loading, setLoading] = useState(true);
  const { isAdmin, isStaff, isCustomer, customerId } = useAuth();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total documents
        let docsQuery = supabase.from('documents').select('id', { count: 'exact', head: true });
        if (isCustomer && customerId) {
          docsQuery = docsQuery.eq('customer_id', customerId);
        }
        const { count: totalDocs } = await docsQuery;

        // Fetch pending documents
        let pendingQuery = supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        if (isCustomer && customerId) {
          pendingQuery = pendingQuery.eq('customer_id', customerId);
        }
        const { count: pendingDocs } = await pendingQuery;

        // Fetch recent uploads (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        let recentQuery = supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString());
        if (isCustomer && customerId) {
          recentQuery = recentQuery.eq('customer_id', customerId);
        }
        const { count: recentDocs } = await recentQuery;

        let totalCustomers = 0;
        let totalUsers = 0;
        let totalStorageBytes = 0;
        let storageByCategory: StorageBreakdownItem[] = [];
        let storageByCustomer: StorageBreakdownItem[] = [];

        if (isAdmin || isStaff) {
          // Fetch total customers
          const { count: customersCount } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true });
          totalCustomers = customersCount || 0;
        }

        if (isAdmin) {
          // Fetch total users
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          totalUsers = usersCount || 0;

          // Fetch documents with category and customer info for storage breakdown
          const { data: storageDocs } = await supabase
            .from('documents')
            .select('file_size, category_id, customer_id');
          const { data: folderDocs } = await supabase
            .from('folder_documents')
            .select('file_size');
          const docBytes = (storageDocs || []).reduce((sum, d) => sum + (d.file_size || 0), 0);
          const folderBytes = (folderDocs || []).reduce((sum, d) => sum + (d.file_size || 0), 0);
          totalStorageBytes = docBytes + folderBytes;

          // Storage by category
          const { data: cats } = await supabase.from('document_categories').select('id, name');
          if (cats && storageDocs) {
            const catMap = new Map<string, number>();
            for (const doc of storageDocs) {
              catMap.set(doc.category_id, (catMap.get(doc.category_id) || 0) + (doc.file_size || 0));
            }
            storageByCategory = cats
              .map(c => ({ name: c.name, bytes: catMap.get(c.id) || 0 }))
              .filter(c => c.bytes > 0)
              .sort((a, b) => b.bytes - a.bytes);
          }

          // Storage by customer (top 10)
          if (storageDocs) {
            const custMap = new Map<string, number>();
            for (const doc of storageDocs) {
              custMap.set(doc.customer_id, (custMap.get(doc.customer_id) || 0) + (doc.file_size || 0));
            }
            const custIds = Array.from(custMap.keys());
            const { data: customers } = await supabase
              .from('customers')
              .select('id, full_name, account_number')
              .in('id', custIds);
            if (customers) {
              const custNameMap = new Map(customers.map(c => [c.id, `${c.account_number} - ${c.full_name}`]));
              storageByCustomer = Array.from(custMap.entries())
                .map(([id, bytes]) => ({ name: custNameMap.get(id) || 'Unknown', bytes }))
                .sort((a, b) => b.bytes - a.bytes)
                .slice(0, 10);
            }
          }
        }

        // Fetch documents by category
        const { data: categories } = await supabase
          .from('document_categories')
          .select('id, name');

        const documentsByCategory: { name: string; count: number }[] = [];
        if (categories) {
          for (const category of categories) {
            let categoryQuery = supabase
              .from('documents')
              .select('id', { count: 'exact', head: true })
              .eq('category_id', category.id);
            if (isCustomer && customerId) {
              categoryQuery = categoryQuery.eq('customer_id', customerId);
            }
            const { count } = await categoryQuery;
            documentsByCategory.push({
              name: category.name,
              count: count || 0,
            });
          }
        }

        setStats({
          totalDocuments: totalDocs || 0,
          totalCustomers,
          totalUsers,
          pendingDocuments: pendingDocs || 0,
          recentUploads: recentDocs || 0,
          totalStorageBytes,
          storageByCategory,
          storageByCustomer,
          documentsByCategory,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [isAdmin, isStaff, isCustomer, customerId]);

  return { stats, loading };
}
