-- =============================================================================
-- MeyVeda — Seed Data
-- Populates the database with demo practitioners, tasks, and records
-- Run: psql $DATABASE_URL -f db/seed.sql
-- Or:  SUPABASE_DB_PASSWORD=Meyveda2026 npx supabase db push (after adding to migrations)
-- =============================================================================

-- ─── Users ───────────────────────────────────────────────────────────────────

INSERT INTO users (id, mobile, email, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', '+919876543210', 'aditi.shastri@meyveda.in', 'practitioner'),
  ('a0000000-0000-0000-0000-000000000002', '+919876543211', 'ramesh.iyer@meyveda.in', 'practitioner'),
  ('a0000000-0000-0000-0000-000000000003', '+919876543212', 'farah.khan@meyveda.in', 'practitioner'),
  ('a0000000-0000-0000-0000-000000000004', '+919876543213', 'priya.menon@meyveda.in', 'practitioner'),
  ('b0000000-0000-0000-0000-000000000001', '+919000000001', 'demo.patient@meyveda.in', 'patient');

-- ─── Practitioners ───────────────────────────────────────────────────────────

INSERT INTO practitioners (
  id, user_id, full_name, gender, bio, languages, disciplines,
  specializations, qualifications, experience_years,
  hpr_id, hpr_verified, verification_status,
  rating_avg, rating_count, consultation_count,
  base_video_fee, base_clinic_fee
) VALUES
(
  'doc-0001-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Dr. Aditi Shastri', 'female',
  'Senior Ayurvedic Physician specialising in Panchakarma detoxification and chronic joint management. Combines classical Ayurvedic methodology with evidence-informed clinical practice.',
  '{"English","Hindi","Kannada"}',
  '{"Ayurveda"}',
  '{"Panchakarma & Chronic Joint Care"}',
  '{"BAMS","MD Ayurveda","PG Panchakarma"}',
  15,
  'HPR-4902-8822', TRUE, 'verified',
  4.90, 1284, 3200,
  69900, 99900  -- ₹699, ₹999 (paise)
),
(
  'doc-0002-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'Dr. Ramesh Iyer', 'male',
  'Specialising in Agni (digestive fire) restoration, Agnimandya management, and metabolic correction through classical herbal formulations.',
  '{"English","Tamil","Telugu"}',
  '{"Ayurveda"}',
  '{"Digestive Disorders & Metabolism"}',
  '{"BAMS","PG Kaya Chikitsa"}',
  11,
  'HPR-3712-5500', TRUE, 'verified',
  4.70, 876, 2100,
  49900, 0
),
(
  'doc-0003-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000003',
  'Dr. Farah Khan', 'female',
  'Expert in Mizaj-based diagnosis and humoral balance correction through Unani pharmacopoeia including Majoon, Sharbat, and Khamira formulations.',
  '{"English","Urdu","Hindi"}',
  '{"Unani"}',
  '{"Unani Internal Medicine"}',
  '{"BUMS","MD Unani Medicine"}',
  9,
  'HPR-6601-2290', TRUE, 'verified',
  4.80, 542, 1500,
  59900, 79900
),
(
  'doc-0004-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000004',
  'Dr. Priya Menon', 'female',
  'Certified therapeutic yoga specialist offering evidence-based yoga protocols for spinal disorders, stress management, and chronic pain rehabilitation.',
  '{"English","Malayalam","Tamil"}',
  '{"Yoga"}',
  '{"Yoga Therapy & Spine Rehabilitation"}',
  '{"BSc Yoga","PGDY","PGDYT"}',
  7,
  'HPR-8810-4430', TRUE, 'verified',
  4.90, 398, 1200,
  39900, 0
);

-- ─── Demo Patient ─────────────────────────────────────────────────────────────

INSERT INTO patients (id, user_id, full_name, date_of_birth, gender, city, pin_code, prakriti)
VALUES (
  'pat-0001-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'Demo Patient', '1990-06-15', 'male',
  'Bangalore', '560001', 'Vata-Pitta'
);

-- ─── Dinacharya Tasks ─────────────────────────────────────────────────────────

INSERT INTO dinacharya_tasks (id, patient_id, title, description, category, scheduled_date, scheduled_time, done) VALUES
  ('dt-0001', 'pat-0001-0000-0000-000000000001', 'Oil Pulling (Kavala)', 'Swish 1 tbsp sesame oil for 10–15 mins', 'mindfulness', CURRENT_DATE, '06:00', TRUE),
  ('dt-0002', 'pat-0001-0000-0000-000000000001', 'Warm Water with Lemon', 'Ignite digestive fire (Agni)', 'diet', CURRENT_DATE, '06:30', TRUE),
  ('dt-0003', 'pat-0001-0000-0000-000000000001', 'Pranayama — 15 mins', 'Nadi Shodhana & Bhramari breathing', 'exercise', CURRENT_DATE, '07:00', FALSE),
  ('dt-0004', 'pat-0001-0000-0000-000000000001', 'Morning Medication', 'Ashwagandha Churna — 1 tsp with warm milk', 'medicine', CURRENT_DATE, '08:00', FALSE),
  ('dt-0005', 'pat-0001-0000-0000-000000000001', 'Sattvic Lunch', 'Light Pitta-balancing meal, avoid raw foods', 'diet', CURRENT_DATE, '13:00', FALSE),
  ('dt-0006', 'pat-0001-0000-0000-000000000001', 'Evening Medication', 'Triphala — 1 tsp with warm water', 'medicine', CURRENT_DATE, '20:00', FALSE);

-- ─── Health Records ───────────────────────────────────────────────────────────

INSERT INTO health_records (id, patient_id, record_type, title, doctor_name, discipline, summary, record_date) VALUES
  ('hr-0001', 'pat-0001-0000-0000-000000000001', 'consultation', 'Ayurveda Consultation', 'Dr. Aditi Shastri', 'Ayurveda', 'Vata-Pitta imbalance. Prescribed Ashwagandha & Triphala regimen.', '2024-05-28'),
  ('hr-0002', 'pat-0001-0000-0000-000000000001', 'prescription', 'Digital Prescription', 'Dr. Aditi Shastri', 'Ayurveda', 'Ashwagandha Churna · Triphala Churna · Brahmi Ghee', '2024-05-28'),
  ('hr-0003', 'pat-0001-0000-0000-000000000001', 'consultation', 'Yoga Therapy Session', 'Dr. Priya Menon', 'Yoga', 'Spine protocol initiated. 3-month corrective yoga plan created.', '2024-04-15'),
  ('hr-0004', 'pat-0001-0000-0000-000000000001', 'lab', 'Prakriti Assessment', NULL, 'Ayurveda', 'Prakriti: Vata-Pitta dominant. Recommendations documented.', '2024-03-10'),
  ('hr-0005', 'pat-0001-0000-0000-000000000001', 'tracker', 'Digestion Tracking Report', NULL, NULL, '30-day tracking: Bloating reduced by 68%. Energy improved.', '2024-02-20');
