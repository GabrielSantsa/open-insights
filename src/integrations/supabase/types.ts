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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_access_log: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_access_log_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_favorites: {
        Row: {
          app_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_favorites_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          active: boolean
          allow_iframe: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sector_id: string | null
          url: string
        }
        Insert: {
          active?: boolean
          allow_iframe?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sector_id?: string | null
          url: string
        }
        Update: {
          active?: boolean
          allow_iframe?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sector_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          resource: string | null
          resource_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          resource?: string | null
          resource_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          sector_id: string | null
          start_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          sector_id?: string | null
          start_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          sector_id?: string | null
          start_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_principal: string | null
          cnaes_secundarios: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          data_situacao: string | null
          email: string | null
          id: string
          inicio_atividades: string | null
          logradouro: string | null
          mei: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          porte: string | null
          razao_social: string
          responsavel_id: string | null
          sector_id: string | null
          simples_nacional: string | null
          situacao: string | null
          socios: string | null
          status: Database["public"]["Enums"]["company_status"]
          telefone1: string | null
          telefone2: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          data_situacao?: string | null
          email?: string | null
          id?: string
          inicio_atividades?: string | null
          logradouro?: string | null
          mei?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          porte?: string | null
          razao_social: string
          responsavel_id?: string | null
          sector_id?: string | null
          simples_nacional?: string | null
          situacao?: string | null
          socios?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_principal?: string | null
          cnaes_secundarios?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          data_situacao?: string | null
          email?: string | null
          id?: string
          inicio_atividades?: string | null
          logradouro?: string | null
          mei?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          porte?: string | null
          razao_social?: string
          responsavel_id?: string | null
          sector_id?: string | null
          simples_nacional?: string | null
          situacao?: string | null
          socios?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          telefone1?: string | null
          telefone2?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          action: string
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          sector_id: string | null
          sensitive: boolean
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          sector_id?: string | null
          sensitive?: boolean
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          sector_id?: string | null
          sensitive?: boolean
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          approved_by: string | null
          author_id: string | null
          category: string | null
          content: string
          content_richtext: string | null
          cover_image_url: string | null
          created_at: string
          featured: boolean
          id: string
          published_at: string | null
          status: Database["public"]["Enums"]["news_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          author_id?: string | null
          category?: string | null
          content: string
          content_richtext?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          author_id?: string | null
          category?: string | null
          content?: string
          content_richtext?: string | null
          cover_image_url?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      procedure_access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          procedure_id: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          procedure_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          procedure_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_access_logs_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_favorites: {
        Row: {
          created_at: string
          procedure_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          procedure_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          procedure_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_favorites_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_files: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          procedure_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          procedure_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          procedure_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_files_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_steps: {
        Row: {
          created_at: string
          description: string
          id: string
          order_index: number
          procedure_id: string
          required: boolean
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_index: number
          procedure_id: string
          required?: boolean
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_index?: number
          procedure_id?: string
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "procedure_steps_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_user_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "procedure_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_versions: {
        Row: {
          change_note: string | null
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_major: boolean
          procedure_id: string
          title: string
          version: string
        }
        Insert: {
          change_note?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_major?: boolean
          procedure_id: string
          title: string
          version: string
        }
        Update: {
          change_note?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_major?: boolean
          procedure_id?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_versions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          access_count: number
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          last_revision: string | null
          published_at: string | null
          responsible_id: string | null
          sector_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["procedure_status"]
          title: string
          updated_at: string
          version: string
          workflow: Database["public"]["Enums"]["procedure_workflow"]
        }
        Insert: {
          access_count?: number
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_revision?: string | null
          published_at?: string | null
          responsible_id?: string | null
          sector_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["procedure_status"]
          title: string
          updated_at?: string
          version?: string
          workflow?: Database["public"]["Enums"]["procedure_workflow"]
        }
        Update: {
          access_count?: number
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_revision?: string | null
          published_at?: string | null
          responsible_id?: string | null
          sector_id?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["procedure_status"]
          title?: string
          updated_at?: string
          version?: string
          workflow?: Database["public"]["Enums"]["procedure_workflow"]
        }
        Relationships: [
          {
            foreignKeyName: "procedures_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          manager_id: string | null
          position: string | null
          primary_sector_id: string | null
          ramal: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          manager_id?: string | null
          position?: string | null
          primary_sector_id?: string | null
          ramal?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          manager_id?: string | null
          position?: string | null
          primary_sector_id?: string | null
          ramal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_sector_id_fkey"
            columns: ["primary_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          creator_id: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          sector_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sector_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          sector_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_sectors: {
        Row: {
          created_at: string
          sector_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sector_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sector_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_sector_access: {
        Args: { _sector_id: string; _user_id: string }
        Returns: boolean
      }
      increment_procedure_access: {
        Args: { _procedure_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "diretoria"
        | "gerente"
        | "coordenador"
        | "colaborador"
      company_status: "ativo" | "inativo" | "prospecto"
      event_type: "prazo_fiscal" | "reuniao" | "treinamento" | "aviso"
      news_status: "rascunho" | "aguardando_aprovacao" | "publicado"
      notification_type:
        | "nova_demanda"
        | "prazo_proximo"
        | "evento"
        | "nova_noticia"
        | "procedimento_atualizado"
      procedure_status: "rascunho" | "ativo" | "em_revisao" | "obsoleto"
      procedure_workflow: "rascunho" | "em_revisao" | "publicado" | "arquivado"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "nova"
        | "em_andamento"
        | "aguardando"
        | "concluida"
        | "cancelada"
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
      app_role: ["admin", "diretoria", "gerente", "coordenador", "colaborador"],
      company_status: ["ativo", "inativo", "prospecto"],
      event_type: ["prazo_fiscal", "reuniao", "treinamento", "aviso"],
      news_status: ["rascunho", "aguardando_aprovacao", "publicado"],
      notification_type: [
        "nova_demanda",
        "prazo_proximo",
        "evento",
        "nova_noticia",
        "procedimento_atualizado",
      ],
      procedure_status: ["rascunho", "ativo", "em_revisao", "obsoleto"],
      procedure_workflow: ["rascunho", "em_revisao", "publicado", "arquivado"],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "nova",
        "em_andamento",
        "aguardando",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
