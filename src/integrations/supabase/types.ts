export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audiencias: {
        Row: {
          created_at: string
          data: string
          hora: string
          id: string
          local: string
          processo_id: string | null
          processo_numero: string
          status: Database["public"]["Enums"]["audiencia_status"]
          tipo: Database["public"]["Enums"]["audiencia_tipo"]
          updated_at: string
          user_id: string
          google_event_id: string | null
        }
        Insert: {
          created_at?: string
          data: string
          hora: string
          id?: string
          local: string
          processo_id?: string | null
          processo_numero: string
          status?: Database["public"]["Enums"]["audiencia_status"]
          tipo: Database["public"]["Enums"]["audiencia_tipo"]
          updated_at?: string
          user_id: string
          google_event_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          hora?: string
          id?: string
          local?: string
          processo_id?: string | null
          processo_numero?: string
          status?: Database["public"]["Enums"]["audiencia_status"]
          tipo?: Database["public"]["Enums"]["audiencia_tipo"]
          updated_at?: string
          user_id?: string
          google_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audiencias_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiencias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          data_registro: string
          email: string
          endereco: string | null
          id: string
          nome: string
          processos_ativos: number
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          ultimo_contato: string | null
          updated_at: string
          user_id: string
          chave_pix: string | null
          instituicao_financeira: string | null
          numero: string | null
          bairro: string | null
          referencia: string | null
          filiacao: string | null
          contatos_complementares: Json | null
          nicho: string | null
        }
        Insert: {
          created_at?: string
          data_registro?: string
          email: string
          endereco?: string | null
          id?: string
          nome: string
          processos_ativos?: number
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          user_id: string
          chave_pix?: string | null
          instituicao_financeira?: string | null
          numero?: string | null
          bairro?: string | null
          referencia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          filiacao?: string | null
          contatos_complementares?: Json | null
          nicho?: string | null
        }
        Update: {
          created_at?: string
          data_registro?: string
          email?: string
          endereco?: string | null
          id?: string
          nome?: string
          processos_ativos?: number
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          user_id?: string
          chave_pix?: string | null
          instituicao_financeira?: string | null
          numero?: string | null
          bairro?: string | null
          referencia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          filiacao?: string | null
          contatos_complementares?: Json | null
          nicho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          id: string
          nome: string
          storage_path: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          storage_path: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          storage_path?: string
          ativo?: boolean
          created_at?: string
        }
      }
      documentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          nome: string
          processo_id: string | null
          storage_path: string | null
          tamanho: number | null
          user_id: string
          google_drive_link: string | null
          categoria: string | null
          is_folder: boolean | null
          parent_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          nome: string
          processo_id?: string | null
          storage_path?: string | null
          tamanho?: number | null
          user_id: string
          google_drive_link?: string | null
          categoria?: string | null
          is_folder?: boolean | null
          parent_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          nome?: string
          processo_id?: string | null
          storage_path?: string | null
          tamanho?: number | null
          user_id?: string
          google_drive_link?: string | null
          categoria?: string | null
          is_folder?: boolean | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_lancamentos: {
        Row: {
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          status: Database["public"]["Enums"]["lancamento_status"]
          updated_at: string
          user_id: string
          valor: number
          tipo_lancamento: string
          valor_cliente: number | null
          valor_escritorio: number | null
          valor_parceiro: number | null
          valor_reserva: number | null
          status_cliente: string | null
          status_parceiro: string | null
          data_pgto_cliente: string | null
          data_pgto_parceiro: string | null
          caixa_box: string | null
          pct_parceiro2: number | null
          pct_parceiro3: number | null
          valor_parceiro2: number | null
          valor_parceiro3: number | null
          pct_reserva: number | null
          valor_sucumbencia: number | null
          instituicao_financeira: string | null
          depositante: string | null
          data_fato_gerador: string | null
          parceiro_id_1: string | null
          parceiro_id_2: string | null
          parceiro_id_3: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          status?: Database["public"]["Enums"]["lancamento_status"]
          updated_at?: string
          user_id: string
          valor: number
          tipo_lancamento: string
          valor_cliente?: number | null
          valor_escritorio?: number | null
          valor_parceiro?: number | null
          valor_reserva?: number | null
          status_cliente?: string | null
          status_parceiro?: string | null
          data_pgto_cliente?: string | null
          data_pgto_parceiro?: string | null
          caixa_box?: string | null
          pct_parceiro2?: number | null
          pct_parceiro3?: number | null
          valor_parceiro2?: number | null
          valor_parceiro3?: number | null
          pct_reserva?: number | null
          valor_sucumbencia?: number | null
          instituicao_financeira?: string | null
          depositante?: string | null
          data_fato_gerador?: string | null
          parceiro_id_1?: string | null
          parceiro_id_2?: string | null
          parceiro_id_3?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          status?: Database["public"]["Enums"]["lancamento_status"]
          updated_at?: string
          user_id?: string
          valor?: number
          tipo_lancamento?: string
          valor_cliente?: number | null
          valor_escritorio?: number | null
          valor_parceiro?: number | null
          valor_reserva?: number | null
          status_cliente?: string | null
          status_parceiro?: string | null
          data_pgto_cliente?: string | null
          data_pgto_parceiro?: string | null
          caixa_box?: string | null
          pct_parceiro2?: number | null
          pct_parceiro3?: number | null
          valor_parceiro2?: number | null
          valor_parceiro3?: number | null
          pct_reserva?: number | null
          valor_sucumbencia?: number | null
          instituicao_financeira?: string | null
          depositante?: string | null
          data_fato_gerador?: string | null
          parceiro_id_1?: string | null
          parceiro_id_2?: string | null
          parceiro_id_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financeiro_lancamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integration: {
        Row: {
          id: string
          user_id: string | null
          client_id: string
          client_secret: string
          access_token: string | null
          refresh_token: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          client_id: string
          client_secret: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          client_id?: string
          client_secret?: string
          access_token?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integration_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      processos: {
        Row: {
          assunto: string
          cliente_id: string
          created_at: string
          data_inicio: string
          data_limite: string | null
          id: string
          instancia: string | null
          numero: string
          prioridade: Database["public"]["Enums"]["processo_prioridade"]
          responsavel: string | null
          status: Database["public"]["Enums"]["processo_status"]
          updated_at: string
          user_id: string
          valor_causa: number | null
        }
        Insert: {
          assunto: string
          cliente_id: string
          created_at?: string
          data_inicio: string
          data_limite?: string | null
          id?: string
          instancia?: string | null
          numero: string
          prioridade?: Database["public"]["Enums"]["processo_prioridade"]
          responsavel?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          user_id: string
          valor_causa?: number | null
        }
        Update: {
          assunto?: string
          cliente_id?: string
          created_at?: string
          data_inicio?: string
          data_limite?: string | null
          id?: string
          instancia?: string | null
          numero?: string
          prioridade?: Database["public"]["Enums"]["processo_prioridade"]
          responsavel?: string | null
          status?: Database["public"]["Enums"]["processo_status"]
          updated_at?: string
          user_id?: string
          valor_causa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string
          data_conclusao: string
          descricao: string
          id: string
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel: string
          status: Database["public"]["Enums"]["tarefa_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_conclusao: string
          descricao: string
          id?: string
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string
          descricao?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          responsavel?: string
          status?: Database["public"]["Enums"]["tarefa_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe: {
        Row: {
          created_at: string
          id: string
          user_id: string
          nome: string
          email: string
          telefone: string | null
          cargo: string
          departamento: string
          data_admissao: string | null
          salario: number | null
          status: "Ativo" | "Inativo" | "Férias" | null
          endereco: string | null
          observacoes: string | null
          foto_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          nome: string
          email: string
          telefone?: string | null
          cargo: string
          departamento: string
          data_admissao?: string | null
          salario?: number | null
          status?: "Ativo" | "Inativo" | "Férias" | null
          endereco?: string | null
          observacoes?: string | null
          foto_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          nome?: string
          email?: string
          telefone?: string | null
          cargo?: string
          departamento?: string
          data_admissao?: string | null
          salario?: number | null
          status?: "Ativo" | "Inativo" | "Férias" | null
          endereco?: string | null
          observacoes?: string | null
          foto_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audiencia_status: "Agendada" | "Realizada" | "Cancelada" | "Reagendada"
      audiencia_tipo: "Instrução" | "Conciliação" | "Julgamento" | "Una"
      cliente_status: "Ativo" | "Inativo"
      lancamento_status: "Pago" | "Pendente"
      processo_prioridade: "Alta" | "Média" | "Baixa"
      processo_status: "A protocolar (pendente)" | "Em confecção inicial" | "Protocolado petição inicial" | "Aguardando citação" | "Aguardando audiência inicial" | "Prazo recursal" | "Aguardando movimentação" | "Aguardando audiência instrução" | "Preparar audiência" | "Aguardando sentença" | "Impulsionar" | "Acordo em andamento" | "Aguardando alvará" | "Aguardando audiência" | "Arquivado"
      tarefa_prioridade: "Baixa" | "Média" | "Alta"
      tarefa_status: "Pendente" | "Em Andamento" | "Em Revisão" | "Concluída"
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
      audiencia_status: ["Agendada", "Realizada", "Cancelada", "Reagendada"],
      audiencia_tipo: ["Instrução", "Conciliação", "Julgamento", "Una"],
      cliente_status: ["Ativo", "Inativo"],
      lancamento_status: ["Pago", "Pendente"],
      processo_prioridade: ["Alta", "Média", "Baixa"],
      processo_status: ["A protocolar (pendente)", "Em confecção inicial", "Protocolado petição inicial", "Aguardando citação", "Aguardando audiência inicial", "Prazo recursal", "Aguardando movimentação", "Aguardando audiência instrução", "Preparar audiência", "Aguardando sentença", "Impulsionar", "Acordo em andamento", "Aguardando alvará", "Aguardando audiência", "Arquivado"],
      tarefa_prioridade: ["Baixa", "Média", "Alta"],
      tarefa_status: ["Pendente", "Em Andamento", "Em Revisão", "Concluída"],
    },
  },
} as const
