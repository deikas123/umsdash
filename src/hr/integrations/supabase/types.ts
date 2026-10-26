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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          audience_value: string | null
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          pinned: boolean
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          audience_value?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          audience_value?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          id: string
          items: Json
          name: string
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          name: string
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          name?: string
          type?: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          hod_user_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hod_user_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hod_user_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_checklists: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          items_state: Json
          started_at: string
          status: Database["public"]["Enums"]["checklist_status"]
          template_id: string | null
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          items_state?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["checklist_status"]
          template_id?: string | null
          type: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          items_state?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["checklist_status"]
          template_id?: string | null
          type?: Database["public"]["Enums"]["checklist_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_checklists_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_type: string
          employee_id: string
          expiry_date: string | null
          file_url: string
          id: string
          issue_date: string | null
          notes: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          employee_id: string
          expiry_date?: string | null
          file_url: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          account_number: string
          annual_leave_days: number
          bank_branch: string
          bank_code: string
          bank_name: string
          basic_pay: number
          created_at: string
          date_of_birth: string | null
          department_id: string | null
          designation: string
          email: string
          first_name: string
          house_allowance: number
          id: string
          id_number: string
          join_date: string
          kra_pin: string
          last_name: string
          nhif_no: string
          nssf_no: string
          other_allowance: number
          phone: string
          staff_number: string
          status: Database["public"]["Enums"]["employee_status"]
          transport_allowance: number
          updated_at: string
          used_leave_days: number
        }
        Insert: {
          account_number?: string
          annual_leave_days?: number
          bank_branch?: string
          bank_code?: string
          bank_name?: string
          basic_pay?: number
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string
          email: string
          first_name: string
          house_allowance?: number
          id?: string
          id_number: string
          join_date?: string
          kra_pin: string
          last_name: string
          nhif_no: string
          nssf_no: string
          other_allowance?: number
          phone: string
          staff_number: string
          status?: Database["public"]["Enums"]["employee_status"]
          transport_allowance?: number
          updated_at?: string
          used_leave_days?: number
        }
        Update: {
          account_number?: string
          annual_leave_days?: number
          bank_branch?: string
          bank_code?: string
          bank_name?: string
          basic_pay?: number
          created_at?: string
          date_of_birth?: string | null
          department_id?: string | null
          designation?: string
          email?: string
          first_name?: string
          house_allowance?: number
          id?: string
          id_number?: string
          join_date?: string
          kra_pin?: string
          last_name?: string
          nhif_no?: string
          nssf_no?: string
          other_allowance?: number
          phone?: string
          staff_number?: string
          status?: Database["public"]["Enums"]["employee_status"]
          transport_allowance?: number
          updated_at?: string
          used_leave_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          days: number
          document_url: string | null
          employee_id: string
          end_date: string
          gm_approval: Json | null
          hod_approval: Json | null
          hr_approval: Json | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          next_of_kin: string | null
          next_of_kin_phone: string | null
          reason: string
          reliever_name: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          days: number
          document_url?: string | null
          employee_id: string
          end_date: string
          gm_approval?: Json | null
          hod_approval?: Json | null
          hr_approval?: Json | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          reason?: string
          reliever_name?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          days?: number
          document_url?: string | null
          employee_id?: string
          end_date?: string
          gm_approval?: Json | null
          hod_approval?: Json | null
          hr_approval?: Json | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          reason?: string
          reliever_name?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          balance: number
          created_at: string
          deduction_start_date: string | null
          description: string | null
          employee_id: string
          end_date: string | null
          id: string
          loan_type: string
          monthly_deduction: number
          start_date: string | null
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          balance: number
          created_at?: string
          deduction_start_date?: string | null
          description?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          loan_type?: string
          monthly_deduction?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          deduction_start_date?: string | null
          description?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          loan_type?: string
          monthly_deduction?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          approver_notes: string | null
          created_at: string
          employee_id: string
          hours: number
          id: string
          payroll_month: string
          rate_type: Database["public"]["Enums"]["overtime_rate_type"]
          reason: string
          status: Database["public"]["Enums"]["overtime_status"]
          updated_at: string
          work_date: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          approver_notes?: string | null
          created_at?: string
          employee_id: string
          hours: number
          id?: string
          payroll_month: string
          rate_type?: Database["public"]["Enums"]["overtime_rate_type"]
          reason?: string
          status?: Database["public"]["Enums"]["overtime_status"]
          updated_at?: string
          work_date: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          approver_notes?: string | null
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          payroll_month?: string
          rate_type?: Database["public"]["Enums"]["overtime_rate_type"]
          reason?: string
          status?: Database["public"]["Enums"]["overtime_status"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          basic_pay: number
          bonus: number
          created_at: string
          employee_id: string
          employee_nssf: number
          employer_nssf: number
          gross_pay: number
          house_allowance: number
          housing_levy: number
          id: string
          insurance_deduction: number
          insurance_relief: number
          leave_pay: number
          loan_deduction: number
          month: string
          net_pay: number
          other_allowance: number
          other_deduction: number
          overtime: number
          paye: number
          pensionable_pay: number
          personal_relief: number
          shif: number
          tax_payable: number
          taxable_pay: number
          total_deductions: number
          transport_allowance: number
        }
        Insert: {
          basic_pay?: number
          bonus?: number
          created_at?: string
          employee_id: string
          employee_nssf?: number
          employer_nssf?: number
          gross_pay?: number
          house_allowance?: number
          housing_levy?: number
          id?: string
          insurance_deduction?: number
          insurance_relief?: number
          leave_pay?: number
          loan_deduction?: number
          month: string
          net_pay?: number
          other_allowance?: number
          other_deduction?: number
          overtime?: number
          paye?: number
          pensionable_pay?: number
          personal_relief?: number
          shif?: number
          tax_payable?: number
          taxable_pay?: number
          total_deductions?: number
          transport_allowance?: number
        }
        Update: {
          basic_pay?: number
          bonus?: number
          created_at?: string
          employee_id?: string
          employee_nssf?: number
          employer_nssf?: number
          gross_pay?: number
          house_allowance?: number
          housing_levy?: number
          id?: string
          insurance_deduction?: number
          insurance_relief?: number
          leave_pay?: number
          loan_deduction?: number
          month?: string
          net_pay?: number
          other_allowance?: number
          other_deduction?: number
          overtime?: number
          paye?: number
          pensionable_pay?: number
          personal_relief?: number
          shif?: number
          tax_payable?: number
          taxable_pay?: number
          total_deductions?: number
          transport_allowance?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          employee_id: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_holidays: {
        Row: {
          created_at: string
          date: string
          id: string
          is_recurring: boolean
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_recurring?: boolean
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_recurring?: boolean
          name?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["suggestion_category"]
          created_at: string
          gm_notes: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          subject: string
          submitter_user_id: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: Database["public"]["Enums"]["suggestion_category"]
          created_at?: string
          gm_notes?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          subject: string
          submitter_user_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["suggestion_category"]
          created_at?: string
          gm_notes?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          subject?: string
          submitter_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_participation: {
        Row: {
          id: string
          submitted_at: string
          survey_id: string
          user_id: string
        }
        Insert: {
          id?: string
          submitted_at?: string
          survey_id: string
          user_id: string
        }
        Update: {
          id?: string
          submitted_at?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_participation_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          id: string
          submitted_at: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          submitted_at?: string
          survey_id: string
        }
        Update: {
          answers?: Json
          id?: string
          submitted_at?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          last_reminder_at: string | null
          questions: Json
          reminder_channel: string
          reminder_day_of_month: number | null
          reminder_interval_days: number | null
          starts_at: string
          status: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          last_reminder_at?: string | null
          questions?: Json
          reminder_channel?: string
          reminder_day_of_month?: number | null
          reminder_interval_days?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["survey_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          last_reminder_at?: string | null
          questions?: Json
          reminder_channel?: string
          reminder_day_of_month?: number | null
          reminder_interval_days?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["survey_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_employee_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hod_of_department: { Args: { _dept_id: string }; Returns: boolean }
      is_hr_or_gm: { Args: never; Returns: boolean }
      is_thread_participant: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      announcement_audience: "all" | "department" | "role"
      app_role: "gm" | "hr" | "hod" | "staff"
      attendance_status: "present" | "absent" | "late" | "half_day" | "on_leave"
      checklist_status: "in_progress" | "completed"
      checklist_type: "onboarding" | "offboarding"
      employee_status: "active" | "inactive" | "terminated"
      leave_status:
        | "pending_hod"
        | "pending_hr"
        | "pending_gm"
        | "approved"
        | "rejected"
      leave_type:
        | "annual"
        | "sick"
        | "maternity"
        | "paternity"
        | "compassionate"
        | "study"
      loan_status: "pending" | "active" | "paid" | "defaulted"
      overtime_rate_type: "1.5x" | "2x"
      overtime_status: "pending" | "approved" | "rejected"
      suggestion_category:
        | "suggestion"
        | "complaint"
        | "whistleblower"
        | "compliment"
      suggestion_status: "new" | "reviewing" | "actioned" | "dismissed"
      survey_status: "draft" | "active" | "closed"
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
      announcement_audience: ["all", "department", "role"],
      app_role: ["gm", "hr", "hod", "staff"],
      attendance_status: ["present", "absent", "late", "half_day", "on_leave"],
      checklist_status: ["in_progress", "completed"],
      checklist_type: ["onboarding", "offboarding"],
      employee_status: ["active", "inactive", "terminated"],
      leave_status: [
        "pending_hod",
        "pending_hr",
        "pending_gm",
        "approved",
        "rejected",
      ],
      leave_type: [
        "annual",
        "sick",
        "maternity",
        "paternity",
        "compassionate",
        "study",
      ],
      loan_status: ["pending", "active", "paid", "defaulted"],
      overtime_rate_type: ["1.5x", "2x"],
      overtime_status: ["pending", "approved", "rejected"],
      suggestion_category: [
        "suggestion",
        "complaint",
        "whistleblower",
        "compliment",
      ],
      suggestion_status: ["new", "reviewing", "actioned", "dismissed"],
      survey_status: ["draft", "active", "closed"],
    },
  },
} as const
