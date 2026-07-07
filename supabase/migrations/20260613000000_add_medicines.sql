-- =============================================================================
-- Migration: Add commerce columns to medicines and seed catalogue
-- =============================================================================

-- 1. Add commerce columns to medicines table
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS price_paise INTEGER DEFAULT 0;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 100;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Seed basic medicines catalogue
INSERT INTO medicines (id, name, generic_name, brand, discipline, category, standard_dose, price_paise, is_active) VALUES
('11111111-0000-0000-0000-000000000001', 'Ashwagandha Churna', 'Withania somnifera', 'Kottakkal Arya Vaidya Sala', 'Ayurveda', 'Churna', '100g', 28500, true),
('11111111-0000-0000-0000-000000000002', 'Triphala Churna', 'Triphala', 'Himalaya Wellness', 'Ayurveda', 'Churna', '100g', 14500, true),
('11111111-0000-0000-0000-000000000003', 'Chyawanprash', 'Ayurvedic Rasayana', 'Dabur', 'Ayurveda', 'Lehya', '500g', 18900, true),
('11111111-0000-0000-0000-000000000004', 'Tulsi Drop', 'Ocimum sanctum', 'Himalaya', 'Ayurveda', 'Extract', '30ml', 12000, true),
('11111111-0000-0000-0000-000000000005', 'Neem Capsules', 'Azadirachta indica', 'Organic India', 'Ayurveda', 'Capsule', '60 Caps', 24500, true),
('11111111-0000-0000-0000-000000000006', 'Giloy Juice', 'Tinospora cordifolia', 'Patanjali', 'Ayurveda', 'Juice', '500ml', 15900, true),
('11111111-0000-0000-0000-000000000007', 'Triphala Tablets', 'Triphala', 'Kottakkal', 'Ayurveda', 'Tablet', '60 Tabs', 9500, true),
('11111111-0000-0000-0000-000000000008', 'Brahmi Oil', 'Bacopa monnieri', 'Bajaj Keo Karpin', 'Ayurveda', 'Taila', '100ml', 17500, true)
ON CONFLICT (id) DO UPDATE SET 
  brand = EXCLUDED.brand, 
  price_paise = EXCLUDED.price_paise;

-- 3. Seed consultation chain for the demo patient so it shows in "Prescribed Formulations"
INSERT INTO slots (id, practitioner_id, mode, slot_date, start_time, end_time, status, fee)
VALUES (
  '44444444-0000-0000-0000-000000000001',
  'd0c00001-0000-0000-0000-000000000001',
  'video', '2024-05-28', '10:00:00', '10:30:00', 'completed', 50000
) ON CONFLICT (id) DO NOTHING;

INSERT INTO appointments (id, slot_id, practitioner_id, patient_id, mode, status, scheduled_date, scheduled_time)
VALUES (
  '55555555-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001',
  'd0c00001-0000-0000-0000-000000000001',
  'c0000001-0000-0000-0000-000000000001',
  'video', 'completed', '2024-05-28', '10:00:00'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO consultations (id, appointment_id, practitioner_id, patient_id, mode, is_complete)
VALUES (
  '66666666-0000-0000-0000-000000000001',
  '55555555-0000-0000-0000-000000000001',
  'd0c00001-0000-0000-0000-000000000001',
  'c0000001-0000-0000-0000-000000000001',
  'video', true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescriptions (id, consultation_id, patient_id, practitioner_id, status)
VALUES (
  '22222222-0000-0000-0000-000000000001',
  '66666666-0000-0000-0000-000000000001',
  'c0000001-0000-0000-0000-000000000001',
  'd0c00001-0000-0000-0000-000000000001',
  'finalized'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_items (id, prescription_id, medicine_id, medicine_name, dose, frequency, duration_days, sort_order)
VALUES 
(
  '33333333-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Ashwagandha Churna',
  '1 tsp',
  'BD',
  30,
  1
),
(
  '33333333-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000002',
  'Triphala Churna',
  '1 tsp',
  'HS',
  30,
  2
)
ON CONFLICT (id) DO NOTHING;
