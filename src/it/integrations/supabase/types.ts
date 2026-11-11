export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Enums: {
      it_account_status: 'active' | 'suspended' | 'deactivated'
      it_lifecycle_event: 'onboarded' | 'transferred' | 'offboarded' | 'suspended' | 'reactivated' | 'role_changed'
      it_device_status: 'active' | 'offline' | 'maintenance' | 'retired'
      it_assignment_type: 'primary' | 'shared' | 'unassigned'
      it_security_status: 'secure' | 'review' | 'critical'
      it_hardware_category: 'desktop' | 'laptop' | 'printer' | 'router' | 'switch' | 'server' | 'monitor' | 'ups' | 'external_drive' | 'phone' | 'other'
      it_asset_status: 'in_use' | 'in_storage' | 'under_repair' | 'retired' | 'lost'
      it_session_type: 'remote_desktop' | 'terminal' | 'file_transfer'
      it_session_status: 'requested' | 'authorised' | 'active' | 'ended' | 'failed'
      it_software_status: 'installed' | 'missing' | 'update_available' | 'unauthorised'
      it_update_type: 'os' | 'application' | 'driver' | 'firmware'
      it_update_status: 'pending' | 'scheduled' | 'installed' | 'failed'
      it_maintenance_type: 'preventive' | 'corrective' | 'upgrade' | 'inspection'
      it_maintenance_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      it_login_outcome: 'success' | 'failed'
      it_incident_severity: 'low' | 'medium' | 'high' | 'critical'
      it_incident_status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
      it_ticket_category: 'hardware' | 'software' | 'network' | 'access' | 'email' | 'printer' | 'phone' | 'other'
      it_ticket_priority: 'low' | 'medium' | 'high' | 'urgent'
      it_ticket_status: 'open' | 'assigned' | 'investigating' | 'resolved' | 'escalated' | 'closed'
      it_vps_status: 'up' | 'down' | 'degraded'
      it_cloud_status: 'operational' | 'degraded' | 'outage' | 'maintenance'
      it_db_status: 'up' | 'down' | 'degraded'
      it_backup_status: 'success' | 'failed' | 'running' | 'skipped' | 'partial'
    }
    Tables: {
      it_departments: {
        Row: { id: string; name: string; description: string | null; hod_user_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; description?: string | null; hod_user_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; description?: string | null; hod_user_id?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      it_employees: {
        Row: {
          id: string; user_id: string | null; hr_employee_id: string | null; full_name: string; email: string
          department_id: string | null; department: string; job_title: string; account_username: string
          identity_provider: string; account_status: Database['public']['Enums']['it_account_status']
          mfa_enrolled: boolean; deactivated_at: string | null; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id?: string | null; hr_employee_id?: string | null; full_name: string; email: string
          department_id?: string | null; department?: string; job_title?: string; account_username?: string
          identity_provider?: string; account_status?: Database['public']['Enums']['it_account_status']
          mfa_enrolled?: boolean; deactivated_at?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string | null; hr_employee_id?: string | null; full_name?: string; email?: string
          department_id?: string | null; department?: string; job_title?: string; account_username?: string
          identity_provider?: string; account_status?: Database['public']['Enums']['it_account_status']
          mfa_enrolled?: boolean; deactivated_at?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_access_groups: {
        Row: { id: string; name: string; description: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; description?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; description?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      it_employee_groups: {
        Row: { id: string; employee_id: string; group_id: string; created_at: string }
        Insert: { id?: string; employee_id: string; group_id: string; created_at?: string }
        Update: { id?: string; employee_id?: string; group_id?: string; created_at?: string }
        Relationships: []
      }
      it_lifecycle_events: {
        Row: {
          id: string; employee_id: string; event_type: Database['public']['Enums']['it_lifecycle_event']
          event_date: string; details: Json; performed_by: string | null; notes: string | null; created_at: string
        }
        Insert: {
          id?: string; employee_id: string; event_type: Database['public']['Enums']['it_lifecycle_event']
          event_date?: string; details?: Json; performed_by?: string | null; notes?: string | null; created_at?: string
        }
        Update: {
          id?: string; employee_id?: string; event_type?: Database['public']['Enums']['it_lifecycle_event']
          event_date?: string; details?: Json; performed_by?: string | null; notes?: string | null; created_at?: string
        }
        Relationships: []
      }
      it_devices: {
        Row: {
          id: string; asset_id: string; device_name: string; serial_number: string; manufacturer: string; model: string
          processor: string; ram_gb: number; storage_gb: number; os_version: string; os_edition: string; department: string
          assigned_employee_id: string | null
          assignment_type: Database['public']['Enums']['it_assignment_type']
          status: Database['public']['Enums']['it_device_status']
          last_check_in: string | null
          security_status: Database['public']['Enums']['it_security_status']
          warranty_expiry: string | null; qr_code: string | null; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; asset_id: string; device_name: string; serial_number?: string; manufacturer?: string; model?: string
          processor?: string; ram_gb?: number; storage_gb?: number; os_version?: string; os_edition?: string; department?: string
          assigned_employee_id?: string | null
          assignment_type?: Database['public']['Enums']['it_assignment_type']
          status?: Database['public']['Enums']['it_device_status']
          last_check_in?: string | null
          security_status?: Database['public']['Enums']['it_security_status']
          warranty_expiry?: string | null; qr_code?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; asset_id?: string; device_name?: string; serial_number?: string; manufacturer?: string; model?: string
          processor?: string; ram_gb?: number; storage_gb?: number; os_version?: string; os_edition?: string; department?: string
          assigned_employee_id?: string | null
          assignment_type?: Database['public']['Enums']['it_assignment_type']
          status?: Database['public']['Enums']['it_device_status']
          last_check_in?: string | null
          security_status?: Database['public']['Enums']['it_security_status']
          warranty_expiry?: string | null; qr_code?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_device_assignments: {
        Row: { id: string; device_id: string; employee_id: string | null; assigned_at: string; returned_at: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; device_id: string; employee_id?: string | null; assigned_at?: string; returned_at?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: string; device_id?: string; employee_id?: string | null; assigned_at?: string; returned_at?: string | null; notes?: string | null; created_at?: string }
        Relationships: []
      }
      it_hardware_inventory: {
        Row: {
          id: string; asset_id: string; name: string
          category: Database['public']['Enums']['it_hardware_category']
          manufacturer: string; model: string; serial_number: string; purchase_date: string | null; purchase_cost: number
          assigned_to: string; location: string
          status: Database['public']['Enums']['it_asset_status']
          warranty_expiry: string | null; notes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; asset_id: string; name: string
          category?: Database['public']['Enums']['it_hardware_category']
          manufacturer?: string; model?: string; serial_number?: string; purchase_date?: string | null; purchase_cost?: number
          assigned_to?: string; location?: string
          status?: Database['public']['Enums']['it_asset_status']
          warranty_expiry?: string | null; notes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; asset_id?: string; name?: string
          category?: Database['public']['Enums']['it_hardware_category']
          manufacturer?: string; model?: string; serial_number?: string; purchase_date?: string | null; purchase_cost?: number
          assigned_to?: string; location?: string
          status?: Database['public']['Enums']['it_asset_status']
          warranty_expiry?: string | null; notes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_device_compliance: {
        Row: {
          id: string; device_id: string; antivirus_ok: boolean; disk_encryption_ok: boolean; firewall_ok: boolean
          os_supported: boolean; mfa_enrolled: boolean; last_checked: string; notes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; device_id: string; antivirus_ok?: boolean; disk_encryption_ok?: boolean; firewall_ok?: boolean
          os_supported?: boolean; mfa_enrolled?: boolean; last_checked?: string; notes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; device_id?: string; antivirus_ok?: boolean; disk_encryption_ok?: boolean; firewall_ok?: boolean
          os_supported?: boolean; mfa_enrolled?: boolean; last_checked?: string; notes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_remote_sessions: {
        Row: {
          id: string; device_id: string | null; technician_id: string | null
          session_type: Database['public']['Enums']['it_session_type']
          status: Database['public']['Enums']['it_session_status']
          started_at: string | null; ended_at: string | null; authorised_by: string | null; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; device_id?: string | null; technician_id?: string | null
          session_type?: Database['public']['Enums']['it_session_type']
          status?: Database['public']['Enums']['it_session_status']
          started_at?: string | null; ended_at?: string | null; authorised_by?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; device_id?: string | null; technician_id?: string | null
          session_type?: Database['public']['Enums']['it_session_type']
          status?: Database['public']['Enums']['it_session_status']
          started_at?: string | null; ended_at?: string | null; authorised_by?: string | null; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_software_catalogue: {
        Row: { id: string; name: string; vendor: string; category: string; approved: boolean; current_version: string; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; vendor?: string; category?: string; approved?: boolean; current_version?: string; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; vendor?: string; category?: string; approved?: boolean; current_version?: string; notes?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      it_software_inventory: {
        Row: {
          id: string; device_id: string; name: string; version: string
          status: Database['public']['Enums']['it_software_status']
          last_seen: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; device_id: string; name: string; version?: string
          status?: Database['public']['Enums']['it_software_status']
          last_seen?: string; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; device_id?: string; name?: string; version?: string
          status?: Database['public']['Enums']['it_software_status']
          last_seen?: string; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_updates: {
        Row: {
          id: string; device_id: string; update_name: string
          type: Database['public']['Enums']['it_update_type']
          status: Database['public']['Enums']['it_update_status']
          released_at: string | null; installed_at: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; device_id: string; update_name: string
          type?: Database['public']['Enums']['it_update_type']
          status?: Database['public']['Enums']['it_update_status']
          released_at?: string | null; installed_at?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; device_id?: string; update_name?: string
          type?: Database['public']['Enums']['it_update_type']
          status?: Database['public']['Enums']['it_update_status']
          released_at?: string | null; installed_at?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_maintenance: {
        Row: {
          id: string; device_id: string | null; hardware_id: string | null
          type: Database['public']['Enums']['it_maintenance_type']
          status: Database['public']['Enums']['it_maintenance_status']
          scheduled_date: string | null; performed_by: string; description: string; cost: number
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; device_id?: string | null; hardware_id?: string | null
          type?: Database['public']['Enums']['it_maintenance_type']
          status?: Database['public']['Enums']['it_maintenance_status']
          scheduled_date?: string | null; performed_by?: string; description?: string; cost?: number
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; device_id?: string | null; hardware_id?: string | null
          type?: Database['public']['Enums']['it_maintenance_type']
          status?: Database['public']['Enums']['it_maintenance_status']
          scheduled_date?: string | null; performed_by?: string; description?: string; cost?: number
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_login_activity: {
        Row: {
          id: string; employee_id: string | null; device_id: string | null; login_at: string; ip_address: string
          outcome: Database['public']['Enums']['it_login_outcome']
          mfa_used: boolean; location: string; created_at: string
        }
        Insert: {
          id?: string; employee_id?: string | null; device_id?: string | null; login_at?: string; ip_address?: string
          outcome?: Database['public']['Enums']['it_login_outcome']
          mfa_used?: boolean; location?: string; created_at?: string
        }
        Update: {
          id?: string; employee_id?: string | null; device_id?: string | null; login_at?: string; ip_address?: string
          outcome?: Database['public']['Enums']['it_login_outcome']
          mfa_used?: boolean; location?: string; created_at?: string
        }
        Relationships: []
      }
      it_mfa_compliance: {
        Row: { id: string; employee_id: string; enrolled: boolean; method: string; enrolled_at: string | null; last_verified: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; employee_id: string; enrolled?: boolean; method?: string; enrolled_at?: string | null; last_verified?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; employee_id?: string; enrolled?: boolean; method?: string; enrolled_at?: string | null; last_verified?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      it_security_incidents: {
        Row: {
          id: string; title: string; description: string
          severity: Database['public']['Enums']['it_incident_severity']
          status: Database['public']['Enums']['it_incident_status']
          reported_by: string | null; affected_device_id: string | null; affected_employee_id: string | null; assigned_to: string | null
          resolution_notes: string | null; created_at: string; resolved_at: string | null; updated_at: string
        }
        Insert: {
          id?: string; title: string; description?: string
          severity?: Database['public']['Enums']['it_incident_severity']
          status?: Database['public']['Enums']['it_incident_status']
          reported_by?: string | null; affected_device_id?: string | null; affected_employee_id?: string | null; assigned_to?: string | null
          resolution_notes?: string | null; created_at?: string; resolved_at?: string | null; updated_at?: string
        }
        Update: {
          id?: string; title?: string; description?: string
          severity?: Database['public']['Enums']['it_incident_severity']
          status?: Database['public']['Enums']['it_incident_status']
          reported_by?: string | null; affected_device_id?: string | null; affected_employee_id?: string | null; assigned_to?: string | null
          resolution_notes?: string | null; created_at?: string; resolved_at?: string | null; updated_at?: string
        }
        Relationships: []
      }
      it_tickets: {
        Row: {
          id: string; ticket_id: string; title: string; description: string; reporting_employee_id: string | null
          department: string; affected_device_id: string | null
          category: Database['public']['Enums']['it_ticket_category']
          priority: Database['public']['Enums']['it_ticket_priority']
          status: Database['public']['Enums']['it_ticket_status']
          assigned_technician_id: string | null; response_time_minutes: number | null; resolution_time_minutes: number | null
          resolution_notes: string | null; employee_confirmed: boolean
          created_at: string; assigned_at: string | null; resolved_at: string | null; closed_at: string | null; updated_at: string
        }
        Insert: {
          id?: string; ticket_id?: string; title: string; description?: string; reporting_employee_id?: string | null
          department?: string; affected_device_id?: string | null
          category?: Database['public']['Enums']['it_ticket_category']
          priority?: Database['public']['Enums']['it_ticket_priority']
          status?: Database['public']['Enums']['it_ticket_status']
          assigned_technician_id?: string | null; response_time_minutes?: number | null; resolution_time_minutes?: number | null
          resolution_notes?: string | null; employee_confirmed?: boolean
          created_at?: string; assigned_at?: string | null; resolved_at?: string | null; closed_at?: string | null; updated_at?: string
        }
        Update: {
          id?: string; ticket_id?: string; title?: string; description?: string; reporting_employee_id?: string | null
          department?: string; affected_device_id?: string | null
          category?: Database['public']['Enums']['it_ticket_category']
          priority?: Database['public']['Enums']['it_ticket_priority']
          status?: Database['public']['Enums']['it_ticket_status']
          assigned_technician_id?: string | null; response_time_minutes?: number | null; resolution_time_minutes?: number | null
          resolution_notes?: string | null; employee_confirmed?: boolean
          created_at?: string; assigned_at?: string | null; resolved_at?: string | null; closed_at?: string | null; updated_at?: string
        }
        Relationships: []
      }
      it_ticket_comments: {
        Row: { id: string; ticket_id: string; author_id: string | null; author_name: string; body: string; created_at: string }
        Insert: { id?: string; ticket_id: string; author_id?: string | null; author_name?: string; body: string; created_at?: string }
        Update: { id?: string; ticket_id?: string; author_id?: string | null; author_name?: string; body?: string; created_at?: string }
        Relationships: []
      }
      it_vps_monitors: {
        Row: {
          id: string; name: string; host: string; ip_address: string; provider: string
          status: Database['public']['Enums']['it_vps_status']
          uptime_pct: number; cpu_pct: number; ram_pct: number; disk_pct: number; last_checked: string; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; host?: string; ip_address?: string; provider?: string
          status?: Database['public']['Enums']['it_vps_status']
          uptime_pct?: number; cpu_pct?: number; ram_pct?: number; disk_pct?: number; last_checked?: string; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; host?: string; ip_address?: string; provider?: string
          status?: Database['public']['Enums']['it_vps_status']
          uptime_pct?: number; cpu_pct?: number; ram_pct?: number; disk_pct?: number; last_checked?: string; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_cloud_services: {
        Row: {
          id: string; name: string; provider: string; category: string
          status: Database['public']['Enums']['it_cloud_status']
          last_checked: string; url: string; notes: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; provider?: string; category?: string
          status?: Database['public']['Enums']['it_cloud_status']
          last_checked?: string; url?: string; notes?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; provider?: string; category?: string
          status?: Database['public']['Enums']['it_cloud_status']
          last_checked?: string; url?: string; notes?: string | null; created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_database_monitors: {
        Row: {
          id: string; name: string; engine: string; host: string
          status: Database['public']['Enums']['it_db_status']
          size_mb: number; connections: number; slow_queries: number; last_checked: string; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; engine?: string; host?: string
          status?: Database['public']['Enums']['it_db_status']
          size_mb?: number; connections?: number; slow_queries?: number; last_checked?: string; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; name?: string; engine?: string; host?: string
          status?: Database['public']['Enums']['it_db_status']
          size_mb?: number; connections?: number; slow_queries?: number; last_checked?: string; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_backup_monitors: {
        Row: {
          id: string; target_name: string; type: string
          status: Database['public']['Enums']['it_backup_status']
          size_mb: number; completed_at: string | null; next_scheduled: string | null; retention_days: number; notes: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; target_name: string; type?: string
          status?: Database['public']['Enums']['it_backup_status']
          size_mb?: number; completed_at?: string | null; next_scheduled?: string | null; retention_days?: number; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; target_name?: string; type?: string
          status?: Database['public']['Enums']['it_backup_status']
          size_mb?: number; completed_at?: string | null; next_scheduled?: string | null; retention_days?: number; notes?: string | null
          created_at?: string; updated_at?: string
        }
        Relationships: []
      }
      it_report_snapshots: {
        Row: { id: string; report_type: string; period: string; generated_at: string; generated_by: string | null; summary: Json; created_at: string }
        Insert: { id?: string; report_type: string; period?: string; generated_at?: string; generated_by?: string | null; summary?: Json; created_at?: string }
        Update: { id?: string; report_type?: string; period?: string; generated_at?: string; generated_by?: string | null; summary?: Json; created_at?: string }
        Relationships: []
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
