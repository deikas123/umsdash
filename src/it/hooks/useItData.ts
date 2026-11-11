import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/it/integrations/supabase/types';

// ============================================================
// PEOPLE — Departments
// ============================================================
export type DbItDepartment = Tables<'it_departments'>;

export function useItDepartments() {
  return useQuery({
    queryKey: ['it_departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_departments').select('*').order('name');
      if (error) throw error;
      return data as DbItDepartment[];
    },
  });
}
export function useCreateItDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: TablesInsert<'it_departments'>) => {
      const { data, error } = await supabase.from('it_departments').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_departments'] }),
  });
}
export function useUpdateItDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_departments'> & { id: string }) => {
      const { data, error } = await supabase.from('it_departments').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_departments'] }),
  });
}
export function useDeleteItDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_departments'] }),
  });
}

// ============================================================
// PEOPLE — Employees (identity directory)
// ============================================================
export type DbItEmployee = Tables<'it_employees'>;

export function useItEmployees() {
  return useQuery({
    queryKey: ['it_employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_employees').select('*').order('full_name');
      if (error) throw error;
      return data as DbItEmployee[];
    },
  });
}
export function useCreateItEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: TablesInsert<'it_employees'>) => {
      const { data, error } = await supabase.from('it_employees').insert(e).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employees'] }),
  });
}
export function useUpdateItEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_employees'> & { id: string }) => {
      const { data, error } = await supabase.from('it_employees').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employees'] }),
  });
}
export function useDeleteItEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employees'] }),
  });
}

// ============================================================
// PEOPLE — Access Groups & memberships
// ============================================================
export type DbItAccessGroup = Tables<'it_access_groups'>;

export function useItAccessGroups() {
  return useQuery({
    queryKey: ['it_access_groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_access_groups').select('*').order('name');
      if (error) throw error;
      return data as DbItAccessGroup[];
    },
  });
}
export function useCreateItAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: TablesInsert<'it_access_groups'>) => {
      const { data, error } = await supabase.from('it_access_groups').insert(g).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_access_groups'] }),
  });
}
export function useUpdateItAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_access_groups'> & { id: string }) => {
      const { data, error } = await supabase.from('it_access_groups').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_access_groups'] }),
  });
}
export function useDeleteItAccessGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_access_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_access_groups'] }),
  });
}

export type DbItEmployeeGroup = Tables<'it_employee_groups'>;

export function useItEmployeeGroups() {
  return useQuery({
    queryKey: ['it_employee_groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_employee_groups').select('*');
      if (error) throw error;
      return data as DbItEmployeeGroup[];
    },
  });
}
export function useAddEmployeeToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employee_id, group_id }: { employee_id: string; group_id: string }) => {
      const { data, error } = await supabase.from('it_employee_groups').insert({ employee_id, group_id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employee_groups'] }),
  });
}
export function useRemoveEmployeeFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employee_id, group_id }: { employee_id: string; group_id: string }) => {
      const { error } = await supabase.from('it_employee_groups').delete().eq('employee_id', employee_id).eq('group_id', group_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employee_groups'] }),
  });
}

// ============================================================
// PEOPLE — Lifecycle events
// ============================================================
export type DbItLifecycleEvent = Tables<'it_lifecycle_events'>;

export function useItLifecycleEvents(employeeId?: string) {
  return useQuery({
    queryKey: ['it_lifecycle_events', employeeId],
    queryFn: async () => {
      let q = supabase.from('it_lifecycle_events').select('*').order('event_date', { ascending: false });
      if (employeeId) q = q.eq('employee_id', employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItLifecycleEvent[];
    },
  });
}
export function useCreateItLifecycleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: TablesInsert<'it_lifecycle_events'>) => {
      const { data, error } = await supabase.from('it_lifecycle_events').insert(e).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_lifecycle_events'] }),
  });
}

// ============================================================
// DEVICES
// ============================================================
export type DbItDevice = Tables<'it_devices'>;

export function useItDevices() {
  return useQuery({
    queryKey: ['it_devices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_devices').select('*').order('asset_id');
      if (error) throw error;
      return data as DbItDevice[];
    },
  });
}
export function useCreateItDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: TablesInsert<'it_devices'>) => {
      const { data, error } = await supabase.from('it_devices').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_devices'] }),
  });
}
export function useUpdateItDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_devices'> & { id: string }) => {
      const { data, error } = await supabase.from('it_devices').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_devices'] }),
  });
}
export function useDeleteItDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_devices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_devices'] }),
  });
}

export type DbItDeviceAssignment = Tables<'it_device_assignments'>;

export function useItDeviceAssignments(deviceId?: string) {
  return useQuery({
    queryKey: ['it_device_assignments', deviceId],
    queryFn: async () => {
      let q = supabase.from('it_device_assignments').select('*').order('assigned_at', { ascending: false });
      if (deviceId) q = q.eq('device_id', deviceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItDeviceAssignment[];
    },
  });
}
export function useCreateItDeviceAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: TablesInsert<'it_device_assignments'>) => {
      const { data, error } = await supabase.from('it_device_assignments').insert(a).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_device_assignments'] }),
  });
}
export function useReturnItDeviceAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('it_device_assignments').update({ returned_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_device_assignments'] }),
  });
}

export type DbItHardware = Tables<'it_hardware_inventory'>;

export function useItHardwareInventory() {
  return useQuery({
    queryKey: ['it_hardware_inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_hardware_inventory').select('*').order('asset_id');
      if (error) throw error;
      return data as DbItHardware[];
    },
  });
}
export function useCreateItHardware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: TablesInsert<'it_hardware_inventory'>) => {
      const { data, error } = await supabase.from('it_hardware_inventory').insert(h).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_hardware_inventory'] }),
  });
}
export function useUpdateItHardware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_hardware_inventory'> & { id: string }) => {
      const { data, error } = await supabase.from('it_hardware_inventory').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_hardware_inventory'] }),
  });
}
export function useDeleteItHardware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_hardware_inventory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_hardware_inventory'] }),
  });
}

export type DbItCompliance = Tables<'it_device_compliance'>;

export function useItDeviceCompliance(deviceId?: string) {
  return useQuery({
    queryKey: ['it_device_compliance', deviceId],
    queryFn: async () => {
      let q = supabase.from('it_device_compliance').select('*');
      if (deviceId) q = q.eq('device_id', deviceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItCompliance[];
    },
  });
}
export function useUpsertItCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: TablesInsert<'it_device_compliance'>) => {
      // Upsert by device_id (one compliance row per device)
      const { data, error } = await supabase.from('it_device_compliance').upsert(c, { onConflict: 'device_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_device_compliance'] }),
  });
}

// ============================================================
// OPERATIONS
// ============================================================
export type DbItRemoteSession = Tables<'it_remote_sessions'>;

export function useItRemoteSessions() {
  return useQuery({
    queryKey: ['it_remote_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_remote_sessions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbItRemoteSession[];
    },
  });
}
export function useCreateItRemoteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TablesInsert<'it_remote_sessions'>) => {
      const { data, error } = await supabase.from('it_remote_sessions').insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_remote_sessions'] }),
  });
}
export function useUpdateItRemoteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_remote_sessions'> & { id: string }) => {
      const { data, error } = await supabase.from('it_remote_sessions').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_remote_sessions'] }),
  });
}

export type DbItSoftwareCatalogue = Tables<'it_software_catalogue'>;

export function useItSoftwareCatalogue() {
  return useQuery({
    queryKey: ['it_software_catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_software_catalogue').select('*').order('name');
      if (error) throw error;
      return data as DbItSoftwareCatalogue[];
    },
  });
}
export function useCreateItSoftwareCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TablesInsert<'it_software_catalogue'>) => {
      const { data, error } = await supabase.from('it_software_catalogue').insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_software_catalogue'] }),
  });
}
export function useDeleteItSoftwareCatalogue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_software_catalogue').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_software_catalogue'] }),
  });
}

export type DbItSoftwareInventory = Tables<'it_software_inventory'>;

export function useItSoftwareInventory(deviceId?: string) {
  return useQuery({
    queryKey: ['it_software_inventory', deviceId],
    queryFn: async () => {
      let q = supabase.from('it_software_inventory').select('*').order('name');
      if (deviceId) q = q.eq('device_id', deviceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItSoftwareInventory[];
    },
  });
}
export function useCreateItSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TablesInsert<'it_software_inventory'>) => {
      const { data, error } = await supabase.from('it_software_inventory').insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_software_inventory'] }),
  });
}
export function useDeleteItSoftware() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_software_inventory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_software_inventory'] }),
  });
}

export type DbItUpdate = Tables<'it_updates'>;

export function useItUpdates(deviceId?: string) {
  return useQuery({
    queryKey: ['it_updates', deviceId],
    queryFn: async () => {
      let q = supabase.from('it_updates').select('*').order('created_at', { ascending: false });
      if (deviceId) q = q.eq('device_id', deviceId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItUpdate[];
    },
  });
}
export function useCreateItUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (u: TablesInsert<'it_updates'>) => {
      const { data, error } = await supabase.from('it_updates').insert(u).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_updates'] }),
  });
}
export function useUpdateItUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_updates'> & { id: string }) => {
      const { data, error } = await supabase.from('it_updates').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_updates'] }),
  });
}

export type DbItMaintenance = Tables<'it_maintenance'>;

export function useItMaintenance() {
  return useQuery({
    queryKey: ['it_maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_maintenance').select('*').order('scheduled_date', { ascending: false });
      if (error) throw error;
      return data as DbItMaintenance[];
    },
  });
}
export function useCreateItMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: TablesInsert<'it_maintenance'>) => {
      const { data, error } = await supabase.from('it_maintenance').insert(m).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_maintenance'] }),
  });
}
export function useUpdateItMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_maintenance'> & { id: string }) => {
      const { data, error } = await supabase.from('it_maintenance').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_maintenance'] }),
  });
}
export function useDeleteItMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_maintenance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_maintenance'] }),
  });
}

// ============================================================
// SECURITY
// ============================================================
export type DbItLoginActivity = Tables<'it_login_activity'>;

export function useItLoginActivity() {
  return useQuery({
    queryKey: ['it_login_activity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_login_activity').select('*').order('login_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as DbItLoginActivity[];
    },
  });
}
export function useCreateItLoginActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: TablesInsert<'it_login_activity'>) => {
      const { data, error } = await supabase.from('it_login_activity').insert(l).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_login_activity'] }),
  });
}

export type DbItMfaCompliance = Tables<'it_mfa_compliance'>;

export function useItMfaCompliance() {
  return useQuery({
    queryKey: ['it_mfa_compliance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_mfa_compliance').select('*');
      if (error) throw error;
      return data as DbItMfaCompliance[];
    },
  });
}
export function useUpsertItMfaCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: TablesInsert<'it_mfa_compliance'>) => {
      const { data, error } = await supabase.from('it_mfa_compliance').upsert(m, { onConflict: 'employee_id' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_mfa_compliance'] }),
  });
}

export type DbItSecurityIncident = Tables<'it_security_incidents'>;

export function useItSecurityIncidents() {
  return useQuery({
    queryKey: ['it_security_incidents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_security_incidents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbItSecurityIncident[];
    },
  });
}
export function useCreateItSecurityIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TablesInsert<'it_security_incidents'>) => {
      const { data, error } = await supabase.from('it_security_incidents').insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_security_incidents'] }),
  });
}
export function useUpdateItSecurityIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_security_incidents'> & { id: string }) => {
      const { data, error } = await supabase.from('it_security_incidents').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_security_incidents'] }),
  });
}
export function useDeleteItSecurityIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_security_incidents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_security_incidents'] }),
  });
}

// ============================================================
// SUPPORT — Tickets
// ============================================================
export type DbItTicket = Tables<'it_tickets'>;

export function useItTickets() {
  return useQuery({
    queryKey: ['it_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbItTicket[];
    },
  });
}
export function useCreateItTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TablesInsert<'it_tickets'>) => {
      const { data, error } = await supabase.from('it_tickets').insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_tickets'] }),
  });
}
export function useUpdateItTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_tickets'> & { id: string }) => {
      const { data, error } = await supabase.from('it_tickets').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_tickets'] }),
  });
}

export type DbItTicketComment = Tables<'it_ticket_comments'>;

export function useItTicketComments(ticketId?: string) {
  return useQuery({
    queryKey: ['it_ticket_comments', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase.from('it_ticket_comments').select('*').eq('ticket_id', ticketId!).order('created_at', { ascending: true });
      if (error) throw error;
      return data as DbItTicketComment[];
    },
  });
}
export function useCreateItTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: TablesInsert<'it_ticket_comments'>) => {
      const { data, error } = await supabase.from('it_ticket_comments').insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_ticket_comments'] }),
  });
}

// ============================================================
// INFRASTRUCTURE
// ============================================================
export type DbItVps = Tables<'it_vps_monitors'>;
export function useItVpsMonitors() {
  return useQuery({
    queryKey: ['it_vps_monitors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_vps_monitors').select('*').order('name');
      if (error) throw error;
      return data as DbItVps[];
    },
  });
}
export function useCreateItVps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: TablesInsert<'it_vps_monitors'>) => {
      const { data, error } = await supabase.from('it_vps_monitors').insert(v).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_vps_monitors'] }),
  });
}
export function useUpdateItVps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_vps_monitors'> & { id: string }) => {
      const { data, error } = await supabase.from('it_vps_monitors').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_vps_monitors'] }),
  });
}
export function useDeleteItVps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_vps_monitors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_vps_monitors'] }),
  });
}

export type DbItCloudService = Tables<'it_cloud_services'>;
export function useItCloudServices() {
  return useQuery({
    queryKey: ['it_cloud_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_cloud_services').select('*').order('name');
      if (error) throw error;
      return data as DbItCloudService[];
    },
  });
}
export function useCreateItCloudService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: TablesInsert<'it_cloud_services'>) => {
      const { data, error } = await supabase.from('it_cloud_services').insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_cloud_services'] }),
  });
}
export function useUpdateItCloudService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_cloud_services'> & { id: string }) => {
      const { data, error } = await supabase.from('it_cloud_services').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_cloud_services'] }),
  });
}
export function useDeleteItCloudService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_cloud_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_cloud_services'] }),
  });
}

export type DbItDatabaseMonitor = Tables<'it_database_monitors'>;
export function useItDatabaseMonitors() {
  return useQuery({
    queryKey: ['it_database_monitors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_database_monitors').select('*').order('name');
      if (error) throw error;
      return data as DbItDatabaseMonitor[];
    },
  });
}
export function useCreateItDatabaseMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: TablesInsert<'it_database_monitors'>) => {
      const { data, error } = await supabase.from('it_database_monitors').insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_database_monitors'] }),
  });
}
export function useUpdateItDatabaseMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_database_monitors'> & { id: string }) => {
      const { data, error } = await supabase.from('it_database_monitors').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_database_monitors'] }),
  });
}
export function useDeleteItDatabaseMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_database_monitors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_database_monitors'] }),
  });
}

export type DbItBackupMonitor = Tables<'it_backup_monitors'>;
export function useItBackupMonitors() {
  return useQuery({
    queryKey: ['it_backup_monitors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('it_backup_monitors').select('*').order('target_name');
      if (error) throw error;
      return data as DbItBackupMonitor[];
    },
  });
}
export function useCreateItBackupMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: TablesInsert<'it_backup_monitors'>) => {
      const { data, error } = await supabase.from('it_backup_monitors').insert(b).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_backup_monitors'] }),
  });
}
export function useUpdateItBackupMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: TablesUpdate<'it_backup_monitors'> & { id: string }) => {
      const { data, error } = await supabase.from('it_backup_monitors').update(u).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_backup_monitors'] }),
  });
}
export function useDeleteItBackupMonitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('it_backup_monitors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_backup_monitors'] }),
  });
}

// ============================================================
// REPORTS — snapshots
// ============================================================
export type DbItReportSnapshot = Tables<'it_report_snapshots'>;
export function useItReportSnapshots(reportType?: string) {
  return useQuery({
    queryKey: ['it_report_snapshots', reportType],
    queryFn: async () => {
      let q = supabase.from('it_report_snapshots').select('*').order('generated_at', { ascending: false });
      if (reportType) q = q.eq('report_type', reportType);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbItReportSnapshot[];
    },
  });
}
export function useSaveItReportSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: TablesInsert<'it_report_snapshots'>) => {
      const { data, error } = await supabase.from('it_report_snapshots').insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_report_snapshots'] }),
  });
}
