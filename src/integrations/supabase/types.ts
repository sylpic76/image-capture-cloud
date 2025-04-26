export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assistant_memory: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string | null
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          cause: string | null
          created_at: string | null
          description: string
          fix: string | null
          id: string
          project_id: string | null
          severity: string | null
          title: string | null
          tool: string | null
        }
        Insert: {
          cause?: string | null
          created_at?: string | null
          description: string
          fix?: string | null
          id?: string
          project_id?: string | null
          severity?: string | null
          title?: string | null
          tool?: string | null
        }
        Update: {
          cause?: string | null
          created_at?: string | null
          description?: string
          fix?: string | null
          id?: string
          project_id?: string | null
          severity?: string | null
          title?: string | null
          tool?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
        }
        Insert: {
          created_at?: string
          id?: string
          messages: Json
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          summary: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          summary?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      screenshot_log: {
        Row: {
          created_at: string
          id: number
          image_url: string
        }
        Insert: {
          created_at?: string
          id?: number
          image_url: string
        }
        Update: {
          created_at?: string
          id?: number
          image_url?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          added_at: string | null
          extracted_text: string | null
          id: string
          image_url: string | null
          page_url: string | null
          project_id: string | null
        }
        Insert: {
          added_at?: string | null
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          page_url?: string | null
          project_id?: string | null
        }
        Update: {
          added_at?: string | null
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          page_url?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_failures: {
        Row: {
          description: string | null
          id: string
          project_id: string | null
          tried_on: string | null
          why_it_failed: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          project_id?: string | null
          tried_on?: string | null
          why_it_failed?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          project_id?: string | null
          tried_on?: string | null
          why_it_failed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_failures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          stack: string[] | null
          tech_level: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          stack?: string[] | null
          tech_level?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          stack?: string[] | null
          tech_level?: string | null
        }
        Relationships: []
      }
      web_resources: {
        Row: {
          added_at: string | null
          extracted_text: string | null
          html_content: string | null
          id: string
          project_id: string | null
          title: string | null
          url: string
        }
        Insert: {
          added_at?: string | null
          extracted_text?: string | null
          html_content?: string | null
          id?: string
          project_id?: string | null
          title?: string | null
          url: string
        }
        Update: {
          added_at?: string | null
          extracted_text?: string | null
          html_content?: string | null
          id?: string
          project_id?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
