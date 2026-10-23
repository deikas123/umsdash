export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          mentions: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_number: string
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_number: string
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_number?: string
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          created_at: string
          document_id: string
          id: string
          reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          notes: string | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          document_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Update: {
          created_at?: string
          document_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          notes?: string | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category_id: string
          created_at: string
          customer_id: string
          description: string | null
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_private: boolean
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          customer_id: string
          description?: string | null
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_private?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_private?: boolean
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string
          id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string
          id?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_shares: {
        Row: {
          can_edit: boolean
          created_at: string
          folder_id: string
          id: string
          include_subfolders: boolean
          shared_with_user_id: string
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          folder_id: string
          id?: string
          include_subfolders?: boolean
          shared_with_user_id: string
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          folder_id?: string
          id?: string
          include_subfolders?: boolean
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          must_reset_password: boolean
          password_changed_at: string | null
          password_expiry_days: number | null
          phone: string | null
          position: Database["public"]["Enums"]["staff_position"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          must_reset_password?: boolean
          password_changed_at?: string | null
          password_expiry_days?: number | null
          phone?: string | null
          position?: Database["public"]["Enums"]["staff_position"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          must_reset_password?: boolean
          password_changed_at?: string | null
          password_expiry_days?: number | null
          phone?: string | null
          position?: Database["public"]["Enums"]["staff_position"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          recurrence: string
          reminder_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          recurrence?: string
          reminder_date: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          recurrence?: string
          reminder_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          api_response: Json | null
          created_at: string
          id: string
          message: string
          recipient_name: string | null
          recipient_phone: string
          sent_by: string
          sms_type: string
          status: string
        }
        Insert: {
          api_response?: Json | null
          created_at?: string
          id?: string
          message: string
          recipient_name?: string | null
          recipient_phone: string
          sent_by: string
          sms_type?: string
          status?: string
        }
        Update: {
          api_response?: Json | null
          created_at?: string
          id?: string
          message?: string
          recipient_name?: string | null
          recipient_phone?: string
          sent_by?: string
          sms_type?: string
          status?: string
        }
        Relationships: []
      }
      sms_preferences: {
        Row: {
          created_at: string
          id: string
          notify_reminders: boolean
          notify_task_updates: boolean
          notify_tasks: boolean
          phone_number: string | null
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notify_reminders?: boolean
          notify_task_updates?: boolean
          notify_tasks?: boolean
          phone_number?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notify_reminders?: boolean
          notify_task_updates?: boolean
          notify_tasks?: boolean
          phone_number?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          started_at: string | null
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          task_id: string
          upload_type: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          task_id: string
          upload_type?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          task_id?: string
          upload_type?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      escalation_events: {
        Row: {
          actor_id: string | null
          created_at: string
          escalation_id: string
          event_type: string
          from_level: number | null
          id: string
          note: string | null
          to_level: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          escalation_id: string
          event_type: string
          from_level?: number | null
          id?: string
          note?: string | null
          to_level?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          escalation_id?: string
          event_type?: string
          from_level?: number | null
          id?: string
          note?: string | null
          to_level?: number | null
        }
        Relationships: []
      }
      escalation_levels: {
        Row: {
          hours_to_next: number | null
          level: number
          name: string
          target_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          hours_to_next?: number | null
          level: number
          name: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          hours_to_next?: number | null
          level?: number
          name?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      escalations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          current_level: number
          id: string
          level_deadline: string | null
          resolved_at: string | null
          source_id: string
          source_table: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: number
          id?: string
          level_deadline?: string | null
          resolved_at?: string | null
          source_id: string
          source_table: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          current_level?: number
          id?: string
          level_deadline?: string | null
          resolved_at?: string | null
          source_id?: string
          source_table?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          capa_action: string | null
          capa_deadline: string | null
          capa_owner: string | null
          capa_status: string | null
          containment_details: string | null
          created_at: string
          date_of_incident: string | null
          date_reported: string | null
          department: string | null
          description: string | null
          estimated_value: number | null
          financial_amount: number | null
          financial_impact: string | null
          id: string
          immediate_actions: string[] | null
          incident_number: string
          incident_type: string | null
          item_description: string | null
          item_quantity: number | null
          location: string | null
          operational_impact: string[] | null
          persons_involved: string | null
          problem_statement: string | null
          reported_by: string | null
          root_cause_categories: string[] | null
          root_cause_statement: string | null
          safety_impact: string[] | null
          serial_numbers: string | null
          severity: string | null
          status: string
          supporting_docs: string[] | null
          time_of_incident: string | null
          updated_at: string
          urgency: string | null
          user_id: string
          why_1: string | null
          why_2: string | null
          why_3: string | null
          why_4: string | null
          why_5: string | null
          witnesses: string | null
        }
        Insert: {
          capa_action?: string | null
          capa_deadline?: string | null
          capa_owner?: string | null
          capa_status?: string | null
          containment_details?: string | null
          created_at?: string
          date_of_incident?: string | null
          date_reported?: string | null
          department?: string | null
          description?: string | null
          estimated_value?: number | null
          financial_amount?: number | null
          financial_impact?: string | null
          id?: string
          immediate_actions?: string[] | null
          incident_number: string
          incident_type?: string | null
          item_description?: string | null
          item_quantity?: number | null
          location?: string | null
          operational_impact?: string[] | null
          persons_involved?: string | null
          problem_statement?: string | null
          reported_by?: string | null
          root_cause_categories?: string[] | null
          root_cause_statement?: string | null
          safety_impact?: string[] | null
          serial_numbers?: string | null
          severity?: string | null
          status?: string
          supporting_docs?: string[] | null
          time_of_incident?: string | null
          updated_at?: string
          urgency?: string | null
          user_id: string
          why_1?: string | null
          why_2?: string | null
          why_3?: string | null
          why_4?: string | null
          why_5?: string | null
          witnesses?: string | null
        }
        Update: {
          capa_action?: string | null
          capa_deadline?: string | null
          capa_owner?: string | null
          capa_status?: string | null
          containment_details?: string | null
          created_at?: string
          date_of_incident?: string | null
          date_reported?: string | null
          department?: string | null
          description?: string | null
          estimated_value?: number | null
          financial_amount?: number | null
          financial_impact?: string | null
          id?: string
          immediate_actions?: string[] | null
          incident_number?: string
          incident_type?: string | null
          item_description?: string | null
          item_quantity?: number | null
          location?: string | null
          operational_impact?: string[] | null
          persons_involved?: string | null
          problem_statement?: string | null
          reported_by?: string | null
          root_cause_categories?: string[] | null
          root_cause_statement?: string | null
          safety_impact?: string[] | null
          serial_numbers?: string | null
          severity?: string | null
          status?: string
          supporting_docs?: string[] | null
          time_of_incident?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
          why_1?: string | null
          why_2?: string | null
          why_3?: string | null
          why_4?: string | null
          why_5?: string | null
          witnesses?: string | null
        }
        Relationships: []
      }
      ops_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      password_renewals: {
        Row: {
          created_at: string
          id: string
          new_expiry: string
          notes: string | null
          password_id: string
          previous_expiry: string | null
          renewed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_expiry: string
          notes?: string | null
          password_id: string
          previous_expiry?: string | null
          renewed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_expiry?: string
          notes?: string | null
          password_id?: string
          previous_expiry?: string | null
          renewed_by?: string | null
        }
        Relationships: []
      }
      passwords: {
        Row: {
          assigned_to: string | null
          backup_user_id: string | null
          created_at: string
          expiry_date: string
          id: string
          last_notified_at: string | null
          last_renewed_at: string | null
          notified: boolean | null
          owner_user_id: string | null
          phone_number: string | null
          rotation_days: number
          system_name: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          assigned_to?: string | null
          backup_user_id?: string | null
          created_at?: string
          expiry_date: string
          id?: string
          last_notified_at?: string | null
          last_renewed_at?: string | null
          notified?: boolean | null
          owner_user_id?: string | null
          phone_number?: string | null
          rotation_days?: number
          system_name: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          assigned_to?: string | null
          backup_user_id?: string | null
          created_at?: string
          expiry_date?: string
          id?: string
          last_notified_at?: string | null
          last_renewed_at?: string | null
          notified?: boolean | null
          owner_user_id?: string | null
          phone_number?: string | null
          rotation_days?: number
          system_name?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      vendor_issues: {
        Row: {
          created_at: string
          date_reported: string | null
          downtime: string | null
          id: string
          impact: string
          issue: string
          rca_status: string | null
          status: string
          system_name: string | null
          updated_at: string
          uptime_end: string | null
          uptime_percentage: number | null
          uptime_start: string | null
          user_id: string
          vendor: string
        }
        Insert: {
          created_at?: string
          date_reported?: string | null
          downtime?: string | null
          id?: string
          impact?: string
          issue: string
          rca_status?: string | null
          status?: string
          system_name?: string | null
          updated_at?: string
          uptime_end?: string | null
          uptime_percentage?: number | null
          uptime_start?: string | null
          user_id: string
          vendor: string
        }
        Update: {
          created_at?: string
          date_reported?: string | null
          downtime?: string | null
          id?: string
          impact?: string
          issue?: string
          rca_status?: string | null
          status?: string
          system_name?: string | null
          updated_at?: string
          uptime_end?: string | null
          uptime_percentage?: number | null
          uptime_start?: string | null
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string | null
          description: string | null
          icon: string | null
          id: string
          key: string
          name: string
          xp_reward: number
        }
        Insert: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key: string
          name: string
          xp_reward?: number
        }
        Update: {
          category?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          key?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          date: string
          icon: string
          id: string
          label: string
          target_count: number
          type: string
          xp_reward: number
        }
        Insert: {
          date: string
          icon?: string
          id?: string
          label: string
          target_count?: number
          type: string
          xp_reward?: number
        }
        Update: {
          date?: string
          icon?: string
          id?: string
          label?: string
          target_count?: number
          type?: string
          xp_reward?: number
        }
        Relationships: []
      }
      upload_streaks: {
        Row: {
          current_streak: number
          id: string
          last_upload_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_upload_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_upload_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["key"]
          },
        ]
      }
      user_daily_progress: {
        Row: {
          challenge_date: string
          completed: boolean
          completed_at: string | null
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          challenge_date: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          challenge_date?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_progress_challenge_date_fkey"
            columns: ["challenge_date"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["date"]
          },
        ]
      }
      user_xp: {
        Row: {
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_text_content: {
        Row: {
          id: string
          document_id: string
          extracted_text: string | null
          extraction_status: string
          extracted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          extracted_text?: string | null
          extraction_status?: string
          extracted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          extracted_text?: string | null
          extraction_status?: string
          extracted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      export_schedules: {
        Row: {
          id: string
          name: string
          schedule_type: string
          day_of_week: number | null
          day_of_month: number | null
          export_type: string
          format: string
          email_to: string[] | null
          last_run_at: string | null
          next_run_at: string | null
          active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          schedule_type: string
          day_of_week?: number | null
          day_of_month?: number | null
          export_type: string
          format?: string
          email_to?: string[] | null
          last_run_at?: string | null
          next_run_at?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          schedule_type?: string
          day_of_week?: number | null
          day_of_month?: number | null
          export_type?: string
          format?: string
          email_to?: string[] | null
          last_run_at?: string | null
          next_run_at?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          id: string
          name: string
          url: string
          events: string[]
          secret: string | null
          active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          events?: string[]
          secret?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          events?: string[]
          secret?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          name: string
          key_prefix: string
          key_hash: string
          scopes: string[]
          last_used_at: string | null
          expires_at: string | null
          revoked: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          key_prefix: string
          key_hash: string
          scopes?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          revoked?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          key_prefix?: string
          key_hash?: string
          scopes?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          revoked?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tour_definitions: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          is_active: boolean
          steps: Json
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          is_active?: boolean
          steps?: Json
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          is_active?: boolean
          steps?: Json
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_tour_progress: {
        Row: {
          id: string
          user_id: string
          tour_key: string
          status: string
          current_step: number
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tour_key: string
          status?: string
          current_step?: number
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tour_key?: string
          status?: string
          current_step?: number
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_progress_tour_key_fkey"
            columns: ["tour_key"]
            isOneToOne: false
            referencedRelation: "tour_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_tasks: { Args: { _user_id: string }; Returns: boolean }
      create_due_reminder_notifications: { Args: never; Returns: undefined }
      export_schema_ddl: { Args: never; Returns: string }
      get_customer_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_user_position: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["staff_position"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_folder_access: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_folder_owner: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_task_assignee: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer" | "manager" | "user"
      document_status: "pending" | "approved" | "archived"
      staff_position: "super_admin" | "hr" | "hod" | "staff"
      task_priority: "low" | "normal" | "high"
      task_status: "pending" | "in_progress" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "customer", "manager", "user"],
      document_status: ["pending", "approved", "archived"],
      staff_position: ["super_admin", "hr", "hod", "staff"],
      task_priority: ["low", "normal", "high"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
