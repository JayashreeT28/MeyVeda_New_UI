-- Alter patients table to add height, weight, blood_group, and address
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS address TEXT;

-- Alter patient_profiles table to add height, weight, and blood_group
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE public.patient_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);

-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('doctor-documents', 'doctor-documents', true, 5242880, ARRAY['image/png', 'image/jpeg', 'application/pdf']),
  ('patient-reports', 'patient-reports', true, 5242880, ARRAY['image/png', 'image/jpeg', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Enable storage RLS policies if not already present
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects FOR SELECT USING (bucket_id IN ('doctor-documents', 'patient-reports'));

DROP POLICY IF EXISTS "Allow public insert access" ON storage.objects;
CREATE POLICY "Allow public insert access" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('doctor-documents', 'patient-reports'));
