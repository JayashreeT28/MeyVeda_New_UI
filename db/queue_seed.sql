-- =============================================================================
-- MeyVeda — Practitioner Dashboard Queue Seed Data
-- =============================================================================

-- DISABLE RLS SO THE FRONTEND CAN READ THE DATA
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE abha_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- 0. Ensure target doctor exists (d0c00001-0000-0000-0000-000000000001)
INSERT INTO users (id, mobile, email, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', '+919876543210', 'aditi.shastri@meyveda.in', 'practitioner')
ON CONFLICT (mobile) DO NOTHING;

INSERT INTO practitioners (id, user_id, full_name, gender, disciplines, verification_status) VALUES
  ('d0c00001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Dr. Aditi Shastri', 'female', '{"Ayurveda"}', 'verified')
ON CONFLICT DO NOTHING;

-- 1. Create Userssam
INSERT INTO users (id, mobile, email, role) VALUES
  ('b0000000-0000-0000-0000-000000000010', '+919800000010', 'rohit@meyveda.in', 'patient'),
  ('b0000000-0000-0000-0000-000000000011', '+919800000011', 'meera@meyveda.in', 'patient'),
  ('b0000000-0000-0000-0000-000000000012', '+919800000012', 'suresh@meyveda.in', 'patient'),
  ('b0000000-0000-0000-0000-000000000013', '+919800000013', 'kavitha@meyveda.in', 'patient')
ON CONFLICT (mobile) DO NOTHING;

-- 2. Create Patients
INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, city) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'Rohit Kumar', '1994-01-01', 'male', 'Bangalore'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'Meera Patel', '1981-01-01', 'female', 'Bangalore'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012', 'Suresh Rao', '1968-01-01', 'male', 'Bangalore'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000013', 'Kavitha Nair', '1997-01-01', 'female', 'Bangalore')
ON CONFLICT DO NOTHING;

-- 3. Create ABHA Links
INSERT INTO abha_links (user_id, abha_id, abha_address, full_name, date_of_birth, gender, is_verified) VALUES
  ('b0000000-0000-0000-0000-000000000010', '11-1111-1111-1111', 'rohit@abha', 'Rohit Kumar', '1994-01-01', 'male', TRUE),
  ('b0000000-0000-0000-0000-000000000011', '22-2222-2222-2222', 'meera@abha', 'Meera Patel', '1981-01-01', 'female', TRUE),
  ('b0000000-0000-0000-0000-000000000013', '44-4444-4444-4444', 'kavitha@abha', 'Kavitha Nair', '1997-01-01', 'female', TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create Slots (Today)
INSERT INTO slots (id, practitioner_id, mode, slot_date, start_time, end_time, status, fee) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0c00001-0000-0000-0000-000000000001', 'video', CURRENT_DATE, '16:30:00', '16:50:00', 'booked', 69900),
  ('e0000000-0000-0000-0000-000000000002', 'd0c00001-0000-0000-0000-000000000001', 'clinic', CURRENT_DATE, '17:00:00', '17:20:00', 'booked', 99900),
  ('e0000000-0000-0000-0000-000000000003', 'd0c00001-0000-0000-0000-000000000001', 'video', CURRENT_DATE, '17:30:00', '17:50:00', 'booked', 69900),
  ('e0000000-0000-0000-0000-000000000004', 'd0c00001-0000-0000-0000-000000000001', 'clinic', CURRENT_DATE, '15:30:00', '15:50:00', 'booked', 99900)
ON CONFLICT DO NOTHING;

-- 5. Create Appointments
INSERT INTO appointments (id, slot_id, practitioner_id, patient_id, mode, status, reason_for_visit, scheduled_date, scheduled_time, checked_in_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'd0c00001-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'video', 'checked_in', 'Digestive issues, fatigue', CURRENT_DATE, '16:30:00', NOW() - INTERVAL '5 minutes'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'd0c00001-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'clinic', 'scheduled', 'Joint pain, mobility', CURRENT_DATE, '17:00:00', NULL),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'd0c00001-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'video', 'scheduled', 'Skin condition, Pitta', CURRENT_DATE, '17:30:00', NULL),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'd0c00001-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'clinic', 'completed', 'Follow-up — Panchakarma', CURRENT_DATE, '15:30:00', NULL)
ON CONFLICT DO NOTHING;


