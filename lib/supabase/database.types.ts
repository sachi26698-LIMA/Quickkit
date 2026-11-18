export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      quickkit_profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id: string; display_name?: string | null };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      quickkit_favorites: {
        Row: { user_id: string; tool_slug: string; created_at: string };
        Insert: { user_id: string; tool_slug: string };
        Update: never;
        Relationships: [];
      };
      quickkit_contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          consent_at: string;
          created_at: string;
          status: AdminSubmissionStatus;
          internal_notes: string;
        };
        Insert: {
          name: string;
          email: string;
          subject: string;
          message: string;
        };
        Update: { status?: AdminSubmissionStatus; internal_notes?: string };
        Relationships: [];
      };
      quickkit_feedback_submissions: {
        Row: {
          id: string;
          name: string | null;
          message: string;
          consent_at: string;
          created_at: string;
          status: AdminSubmissionStatus;
          feedback_type: FeedbackType;
          internal_notes: string;
          /** 1–5 stars from the homepage form; null for a plain message. */
          rating: number | null;
          tags: string[];
          /** Catalogue slug chosen under "About"; null for QUICKKIT overall. */
          tool_slug: string | null;
        };
        Insert: {
          name?: string | null;
          message: string;
          feedback_type?: FeedbackType;
          rating?: number | null;
          tags?: string[];
          tool_slug?: string | null;
        };
        Update: {
          status?: AdminSubmissionStatus;
          feedback_type?: FeedbackType;
          internal_notes?: string;
        };
        Relationships: [];
      };
      quickkit_tool_feedback: {
        Row: {
          id: string;
          tool_slug: string;
          rating: number;
          tags: string[];
          comment: string;
          status: AdminSubmissionStatus;
          internal_notes: string;
          consent_at: string;
          created_at: string;
        };
        Insert: {
          tool_slug: string;
          rating: number;
          tags?: string[];
          comment?: string;
        };
        Update: { status?: AdminSubmissionStatus; internal_notes?: string };
        Relationships: [];
      };
      quickkit_error_events: {
        Row: {
          id: string;
          created_at: string;
          scope: string;
          name: string;
          message: string;
          digest: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quickkit_tool_feedback_limits: {
        Row: {
          bucket_hash: string;
          window_started_at: string;
          attempt_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quickkit_submission_limits: {
        Row: {
          scope: string;
          bucket_hash: string;
          window_started_at: string;
          attempt_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      quickkit_admin_tool_overrides: {
        Row: ToolOverrideRow;
        Insert: Partial<Omit<ToolOverrideRow, "created_at" | "updated_at">> & {
          tool_slug: string;
        };
        Update: Partial<
          Omit<ToolOverrideRow, "tool_slug" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      quickkit_admin_category_overrides: {
        Row: CategoryOverrideRow;
        Insert: Partial<
          Omit<CategoryOverrideRow, "created_at" | "updated_at">
        > & { category_slug: string };
        Update: Partial<
          Omit<
            CategoryOverrideRow,
            "category_slug" | "created_at" | "updated_at"
          >
        >;
        Relationships: [];
      };
      quickkit_admin_site_settings: {
        Row: {
          setting_key: SiteSettingKey;
          setting_value: Json;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          setting_key: SiteSettingKey;
          setting_value: Json;
          updated_by?: string | null;
        };
        Update: { setting_value?: Json; updated_by?: string | null };
        Relationships: [];
      };
      quickkit_admin_activity: {
        Row: {
          id: number;
          actor_id: string | null;
          actor_email: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_email: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      quickkit_consume_submission_limit: {
        Args: { p_scope: string; p_bucket_hash: string };
        Returns: boolean;
      };
      quickkit_consume_tool_feedback_limit: {
        Args: { p_bucket_hash: string };
        Returns: boolean;
      };
      quickkit_record_visit: {
        Args: { p_visitor: string; p_session: string; p_active_ms: number };
        Returns: undefined;
      };
      quickkit_visitor_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      quickkit_record_error: {
        Args: {
          p_scope: string;
          p_name: string;
          p_message: string;
          p_digest: string;
        };
        Returns: boolean;
      };
      quickkit_system_health: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type AdminSubmissionStatus = "new" | "in_progress" | "resolved";
export type FeedbackType =
  "unclassified" | "general" | "bug" | "feature_request" | "other";
export type SiteSettingKey =
  | "website_name"
  | "tagline"
  | "contact_email"
  | "social_links"
  | "footer_links"
  | "announcement"
  | "maintenance"
  | "homepage_content"
  | "legal_meta";
export type ToolOverrideRow = {
  tool_slug: string;
  name_override: string | null;
  description_override: string | null;
  category_override: string | null;
  icon_override: string | null;
  metadata_override: Json;
  is_published: boolean;
  is_enabled: boolean;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  canonical_path: string | null;
  is_indexable: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
export type CategoryOverrideRow = {
  category_slug: string;
  name_override: string | null;
  description_override: string | null;
  display_order: number | null;
  is_published: boolean;
  seo_title: string | null;
  icon_override: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};
