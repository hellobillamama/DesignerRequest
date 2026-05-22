export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'designer' | 'viewer'
          department: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'designer' | 'viewer'
          department?: string | null
          is_active?: boolean
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'designer' | 'viewer'
          department?: string | null
          is_active?: boolean
        }
      }
      materials: {
        Row: {
          id: string
          material_code: string
          material_name: string
          description: string | null
          category_id: string | null
          vendor_id: string | null
          color: string | null
          size: string | null
          unit: string
          price: number
          balance_qty: number
          min_stock_level: number
          rack_location: string | null
          barcode: string | null
          qr_code_url: string | null
          is_active: boolean
          notes: string | null
          last_upload_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          material_code: string
          material_name: string
          description?: string | null
          category_id?: string | null
          vendor_id?: string | null
          color?: string | null
          size?: string | null
          unit?: string
          price?: number
          balance_qty?: number
          min_stock_level?: number
          rack_location?: string | null
          barcode?: string | null
          qr_code_url?: string | null
          notes?: string | null
        }
        Update: {
          material_name?: string
          description?: string | null
          category_id?: string | null
          vendor_id?: string | null
          color?: string | null
          size?: string | null
          unit?: string
          price?: number
          balance_qty?: number
          min_stock_level?: number
          rack_location?: string | null
          barcode?: string | null
          qr_code_url?: string | null
          notes?: string | null
          last_upload_date?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          icon: string | null
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          color?: string
          icon?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          color?: string
          icon?: string | null
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          is_active?: boolean
        }
      }
      material_images: {
        Row: {
          id: string
          material_id: string
          image_url: string
          image_type: 'main' | 'front' | 'back' | 'texture' | 'detail'
          alt_text: string | null
          sort_order: number
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          material_id: string
          image_url: string
          image_type?: 'main' | 'front' | 'back' | 'texture' | 'detail'
          alt_text?: string | null
          sort_order?: number
          uploaded_by?: string | null
        }
        Update: {
          image_url?: string
          image_type?: 'main' | 'front' | 'back' | 'texture' | 'detail'
          alt_text?: string | null
          sort_order?: number
        }
      }
      material_requests: {
        Row: {
          id: string
          request_number: string
          material_id: string
          requested_by: string
          requested_qty: number
          approved_qty: number | null
          purpose: string
          design_name: string | null
          priority: 'low' | 'normal' | 'high' | 'urgent'
          status: 'pending' | 'approved' | 'rejected' | 'issued' | 'returned' | 'cancelled'
          notes: string | null
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          issued_at: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          material_id: string
          requested_by: string
          requested_qty: number
          purpose: string
          design_name?: string | null
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          notes?: string | null
          due_date?: string | null
        }
        Update: {
          approved_qty?: number | null
          status?: 'pending' | 'approved' | 'rejected' | 'issued' | 'returned' | 'cancelled'
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          issued_at?: string | null
        }
      }
      upload_history: {
        Row: {
          id: string
          filename: string
          uploaded_by: string | null
          total_rows: number
          new_materials: number
          updated_materials: number
          failed_rows: number
          status: 'processing' | 'completed' | 'failed'
          error_log: Json | null
          created_at: string
        }
        Insert: {
          filename: string
          uploaded_by?: string | null
          total_rows?: number
          new_materials?: number
          updated_materials?: number
          failed_rows?: number
          status?: 'processing' | 'completed' | 'failed'
          error_log?: Json | null
        }
        Update: {
          total_rows?: number
          new_materials?: number
          updated_materials?: number
          failed_rows?: number
          status?: 'processing' | 'completed' | 'failed'
          error_log?: Json | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'error'
          link?: string | null
        }
        Update: {
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
        }
        Update: never
      }
      issue_history: {
        Row: {
          id: string
          request_id: string | null
          material_id: string
          issued_to: string
          issued_by: string
          issued_qty: number
          returned_qty: number
          issue_date: string
          return_date: string | null
          notes: string | null
        }
        Insert: {
          request_id?: string | null
          material_id: string
          issued_to: string
          issued_by: string
          issued_qty: number
          returned_qty?: number
          notes?: string | null
        }
        Update: {
          returned_qty?: number
          return_date?: string | null
          notes?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Convenient type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Material = Database['public']['Tables']['materials']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Vendor = Database['public']['Tables']['vendors']['Row']
export type MaterialImage = Database['public']['Tables']['material_images']['Row']
export type MaterialRequest = Database['public']['Tables']['material_requests']['Row']
export type UploadHistory = Database['public']['Tables']['upload_history']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type IssueHistory = Database['public']['Tables']['issue_history']['Row']

// Extended types with joins
export type MaterialWithDetails = Material & {
  categories?: Category | null
  vendors?: Vendor | null
  material_images?: MaterialImage[]
}

export type RequestWithDetails = MaterialRequest & {
  materials?: Material | null
  profiles?: Profile | null
  reviewer?: Profile | null
}
