-- ============================================================
-- Material Management & Designer Request System
-- Supabase PostgreSQL Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fast fuzzy text search

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'designer' CHECK (role IN ('admin', 'designer', 'viewer')),
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by all authenticated" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors viewable by all authenticated" ON public.vendors
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage vendors" ON public.vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- MATERIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_code TEXT NOT NULL UNIQUE,
  material_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  vendor_id UUID REFERENCES public.vendors(id),
  color TEXT,
  size TEXT,
  unit TEXT DEFAULT 'meters',
  price DECIMAL(10, 2) DEFAULT 0,
  balance_qty DECIMAL(10, 2) DEFAULT 0,
  min_stock_level DECIMAL(10, 2) DEFAULT 10,
  rack_location TEXT,
  barcode TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  last_upload_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Search vector for full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(material_code, '') || ' ' ||
      COALESCE(material_name, '') || ' ' ||
      COALESCE(color, '') || ' ' ||
      COALESCE(description, '')
    )
  ) STORED
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS materials_search_idx ON public.materials USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS materials_code_idx ON public.materials(material_code);
CREATE INDEX IF NOT EXISTS materials_name_trgm_idx ON public.materials USING GIN(material_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS materials_category_idx ON public.materials(category_id);
CREATE INDEX IF NOT EXISTS materials_vendor_idx ON public.materials(vendor_id);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials viewable by all authenticated" ON public.materials
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage materials" ON public.materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- MATERIAL IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.material_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'main' CHECK (image_type IN ('main', 'front', 'back', 'texture', 'detail')),
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.material_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Images viewable by all authenticated" ON public.material_images
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage images" ON public.material_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- UPLOAD HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.upload_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  total_rows INT DEFAULT 0,
  new_materials INT DEFAULT 0,
  updated_materials INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Upload history viewable by admins" ON public.upload_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- MATERIAL REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_number TEXT UNIQUE,
  material_id UUID REFERENCES public.materials(id) NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  requested_qty DECIMAL(10, 2) NOT NULL,
  approved_qty DECIMAL(10, 2),
  purpose TEXT NOT NULL,
  design_name TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled')),
  notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS requests_status_idx ON public.material_requests(status);
CREATE INDEX IF NOT EXISTS requests_material_idx ON public.material_requests(material_id);
CREATE INDEX IF NOT EXISTS requests_user_idx ON public.material_requests(requested_by);

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own requests" ON public.material_requests
  FOR SELECT USING (
    requested_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Designers create requests" ON public.material_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Admins manage all requests" ON public.material_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Designers update own pending requests" ON public.material_requests
  FOR UPDATE USING (requested_by = auth.uid() AND status = 'pending');

-- ============================================================
-- ISSUE HISTORY (Material Issue Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.issue_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES public.material_requests(id),
  material_id UUID REFERENCES public.materials(id) NOT NULL,
  issued_to UUID REFERENCES public.profiles(id) NOT NULL,
  issued_by UUID REFERENCES public.profiles(id) NOT NULL,
  issued_qty DECIMAL(10, 2) NOT NULL,
  returned_qty DECIMAL(10, 2) DEFAULT 0,
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  return_date TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issue history viewable by involved parties" ON public.issue_history
  FOR SELECT USING (
    issued_to = auth.uid() OR
    issued_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins manage issue history" ON public.issue_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('request_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS request_seq START 1;

CREATE TRIGGER set_request_number
  BEFORE INSERT ON public.material_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL)
  EXECUTE FUNCTION generate_request_number();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materials_timestamp
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_requests_timestamp
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA - Sample Categories
-- ============================================================
INSERT INTO public.categories (name, description, color) VALUES
  ('Fabric', 'Woven and knitted fabrics', '#6366f1'),
  ('Lining', 'Lining materials', '#8b5cf6'),
  ('Interlining', 'Interlining and interfacing', '#a855f7'),
  ('Thread', 'Sewing threads and yarns', '#ec4899'),
  ('Zipper', 'Zippers and closures', '#f43f5e'),
  ('Button', 'Buttons and fasteners', '#f97316'),
  ('Elastic', 'Elastic and ribbons', '#eab308'),
  ('Label', 'Labels and tags', '#22c55e'),
  ('Accessories', 'Fashion accessories and trims', '#14b8a6'),
  ('Lace', 'Lace and embroidery materials', '#06b6d4'),
  ('Padding', 'Padding and batting materials', '#3b82f6'),
  ('Hardware', 'Metal hardware and findings', '#64748b')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS (run in Supabase Dashboard or via API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('material-images', 'material-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);
