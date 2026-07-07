-- =============================================================================
-- Migration: AyurSanvaad Consultation, EMR, and Admin Schema Integration
-- =============================================================================

-- 1. Extend user roles enum and alter users table
-- Run this outside of block if your PostgreSQL environment restricts ALTER TYPE in tx.
-- In Supabase migrations, ALTER TYPE ADD VALUE is safe to run.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'intern_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Add ABDM optional fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS abha_number VARCHAR(14);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hpr_id_optional VARCHAR(50);

-- 2. CREATE NEW TABLES
-- 2.1 Doctor Profiles
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  full_name       VARCHAR(255) NOT NULL,
  photo_url       TEXT,
  signature_url   TEXT,
  consultation_fee INTEGER NOT NULL DEFAULT 0, -- in paise
  specializations TEXT[] NOT NULL DEFAULT '{}',
  languages       TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user ON doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_active ON doctor_profiles(is_active);

-- 2.2 Doctor Verifications
CREATE TABLE IF NOT EXISTS doctor_verifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  degree_url            TEXT NOT NULL,
  registration_cert_url TEXT NOT NULL,
  hpr_id                VARCHAR(50),
  status                verification_status NOT NULL DEFAULT 'pending',
  rejection_reason      TEXT,
  reviewed_by           UUID REFERENCES users(id),
  reviewed_at           TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_verifications_doc ON doctor_verifications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_verifications_status ON doctor_verifications(status);

-- 2.3 Doctor Availability Templates
CREATE TABLE IF NOT EXISTS doctor_availability_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  mode            consult_mode NOT NULL DEFAULT 'video',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id),
  UNIQUE(doctor_id, day_of_week, start_time, mode)
);

CREATE INDEX IF NOT EXISTS idx_doc_avail_template_doc ON doctor_availability_templates(doctor_id);

-- 2.4 Patient Profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  full_name               VARCHAR(255) NOT NULL,
  date_of_birth           DATE NOT NULL,
  gender                  gender NOT NULL,
  phone                   VARCHAR(15) NOT NULL,
  email                   VARCHAR(255) NOT NULL,
  address                 TEXT,
  abha_number             VARCHAR(14),
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(15),
  allergies               TEXT[] NOT NULL DEFAULT '{}',
  chronic_conditions      TEXT[] NOT NULL DEFAULT '{}',
  current_medications     TEXT[] NOT NULL DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_active ON patient_profiles(is_active);

-- 2.5 Patient Family Members
CREATE TABLE IF NOT EXISTS patient_family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  relationship    relationship NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          gender NOT NULL,
  abha_number     VARCHAR(14),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_patient_fam_patient ON patient_family_members(patient_id);

-- 2.6 Facilities (Branches)
CREATE TABLE IF NOT EXISTS branches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  hfr_id                VARCHAR(50), -- Health Facility Registry ID
  address               TEXT NOT NULL,
  operating_hours_start TIME NOT NULL DEFAULT '09:00:00',
  operating_hours_end   TIME NOT NULL DEFAULT '18:00:00',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id)
);

-- 2.7 Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  room_type   VARCHAR(50) NOT NULL CHECK (room_type IN ('Abhyanga', 'Shirodhara', 'Steam', 'Basti', 'generic')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_branch ON rooms(branch_id);

-- 2.8 Therapists
CREATE TABLE IF NOT EXISTS therapists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(255) NOT NULL,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

-- 2.9 Therapist Availability Templates
CREATE TABLE IF NOT EXISTS therapist_availability_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id  UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id),
  UNIQUE(therapist_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_therapist_avail_therapist ON therapist_availability_templates(therapist_id);

-- 2.10 Alter Appointments & Add Appointment Status History
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_profile_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  status         appointment_status NOT NULL,
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_app_status_hist_app ON appointment_status_history(appointment_id);

-- 2.11 Ashtavidha Pariksha Records (Structured EMR)
CREATE TABLE IF NOT EXISTS ashtavidha_pariksha_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE UNIQUE,
  patient_id      UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  nadi            JSONB NOT NULL, -- dominance sliders, rate, rhythm, notes
  mutra           JSONB NOT NULL, -- color, quantity, frequency, odor, notes
  mala            JSONB NOT NULL, -- consistency, color, frequency, notes
  jihva           JSONB NOT NULL, -- color, coating, cracks, notes, optional photo_url
  shabda          JSONB NOT NULL, -- clarity, tone, notes
  sparsha         JSONB NOT NULL, -- temperature, moisture, notes
  drik            JSONB NOT NULL, -- color, luster, notes
  akriti          JSONB NOT NULL, -- build, posture, notes
  is_draft        BOOLEAN NOT NULL DEFAULT TRUE,
  signed_at       TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ashtavidha_patient ON ashtavidha_pariksha_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_ashtavidha_doctor ON ashtavidha_pariksha_records(doctor_id);

-- 2.12 Prakriti–Vikriti Profiles
CREATE TABLE IF NOT EXISTS prakriti_vikriti_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id              UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id               UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  prakriti_vata_pct       INTEGER NOT NULL,
  prakriti_pitta_pct      INTEGER NOT NULL,
  prakriti_kapha_pct      INTEGER NOT NULL,
  vikriti_vata_pct        INTEGER NOT NULL,
  vikriti_pitta_pct       INTEGER NOT NULL,
  vikriti_kapha_pct       INTEGER NOT NULL,
  questionnaire_responses JSONB NOT NULL, -- full list of questions & answers
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_prakriti_profile_patient ON prakriti_vikriti_profiles(patient_id);

-- 2.13 Diagnoses (NAMASTE + ICD-10)
CREATE TABLE IF NOT EXISTS diagnoses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  diagnosis_text  TEXT NOT NULL,
  namaste_codes   TEXT[] NOT NULL DEFAULT '{}',
  icd10_codes     TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_doctor ON diagnoses(doctor_id);

-- 2.14 Alter Prescriptions & Prescription Items
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_profile_id UUID REFERENCES doctor_profiles(id) ON DELETE SET NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL;

ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS classical_type VARCHAR(50);
ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS time_of_intake VARCHAR(100);

-- 2.15 Treatment Protocols (Panchakarma configurations)
CREATE TABLE IF NOT EXISTS treatment_protocols (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  sequence_steps  JSONB NOT NULL, -- ordered array of {step_name, phase, duration_minutes, min_rest_hours_after, required_therapist_specialization, required_room_type}
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

-- 2.16 Patient Protocol Assignments
CREATE TABLE IF NOT EXISTS patient_protocol_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  protocol_id      UUID NOT NULL REFERENCES treatment_protocols(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
  start_date      DATE NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_protocol_assign_patient ON patient_protocol_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_protocol_assign_doc ON patient_protocol_assignments(doctor_id);

-- 2.17 Protocol Sessions (Panchakarma tracking)
CREATE TABLE IF NOT EXISTS protocol_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id         UUID NOT NULL REFERENCES patient_protocol_assignments(id) ON DELETE CASCADE,
  step_index            INTEGER NOT NULL,
  scheduled_date        DATE NOT NULL,
  scheduled_time        TIME NOT NULL,
  assigned_therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
  assigned_room_id      UUID REFERENCES rooms(id) ON DELETE SET NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed', 'rescheduled')),
  therapist_notes       TEXT,
  patient_feedback      TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_protocol_session_assign ON protocol_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_protocol_session_date ON protocol_sessions(scheduled_date);

-- 2.18 Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  phone         VARCHAR(15),
  email         VARCHAR(255),
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id)
);

-- 2.19 Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  classical_type    VARCHAR(50),
  batch_number      VARCHAR(100) NOT NULL,
  expiry_date       DATE NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 10,
  price_paise       INTEGER NOT NULL DEFAULT 0, -- in paise
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

-- 2.20 Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_change   INTEGER NOT NULL, -- positive for restock, negative for sale
  movement_type     VARCHAR(50) NOT NULL CHECK (movement_type IN ('restock', 'sale', 'adjustment', 'expired')),
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(inventory_item_id);

-- 2.21 Alter Orders, Payments & Refunds
ALTER TABLE orders ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE SET NULL;

-- 2.22 Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  stars           SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review_text     TEXT,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id),
  UNIQUE(consultation_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id);

-- 2.23 Content Articles
CREATE TABLE IF NOT EXISTS content_articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) UNIQUE NOT NULL,
  content       TEXT NOT NULL,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_content_articles_published ON content_articles(is_published);

-- 2.24 Herb Database
CREATE TABLE IF NOT EXISTS herb_database (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sanskrit_name     VARCHAR(255) NOT NULL,
  english_name      VARCHAR(255),
  latin_name        VARCHAR(255),
  properties        JSONB NOT NULL, -- { rasa, guna, virya, vipaka, prabhava }
  indications       TEXT[] NOT NULL DEFAULT '{}',
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  images            TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id)
);

-- 2.25 Consent Logs (ABDM Schema-Ready)
CREATE TABLE IF NOT EXISTS consent_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id     UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  consent_type  VARCHAR(100) NOT NULL,
  status        VARCHAR(50) NOT NULL, -- granted, revoked, expired
  ip_address    INET,
  user_agent    TEXT,
  details       JSONB,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_patient ON consent_logs(patient_id);

-- 2.26 Data Access Logs (ABDM Schema-Ready)
CREATE TABLE IF NOT EXISTS data_access_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id     UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  accessed_by   UUID NOT NULL REFERENCES users(id),
  purpose       VARCHAR(255) NOT NULL, -- clinical, admin, billing, etc.
  record_type   VARCHAR(100) NOT NULL, -- EMR, prescription, lab
  record_id     UUID,
  ip_address    INET,
  user_agent    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_patient ON data_access_logs(patient_id);

-- 2.27 Notification Broadcasts
CREATE TABLE IF NOT EXISTS notification_broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  target_role VARCHAR(50) CHECK (target_role IN ('patient', 'doctor', 'all', 'intern_staff')),
  sent_by     UUID REFERENCES users(id) ON DELETE CASCADE,
  sent_at     TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES users(id)
);


-- =============================================================================
-- 3. TRIGGERS: auto-maintenance for updated_at
-- =============================================================================

CREATE TRIGGER trg_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctor_verifications_updated_at BEFORE UPDATE ON doctor_verifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctor_availability_templates_updated_at BEFORE UPDATE ON doctor_availability_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patient_profiles_updated_at BEFORE UPDATE ON patient_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patient_family_members_updated_at BEFORE UPDATE ON patient_family_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_therapists_updated_at BEFORE UPDATE ON therapists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_therapist_availability_templates_updated_at BEFORE UPDATE ON therapist_availability_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_appointment_status_history_updated_at BEFORE UPDATE ON appointment_status_history FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ashtavidha_pariksha_records_updated_at BEFORE UPDATE ON ashtavidha_pariksha_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_prakriti_vikriti_profiles_updated_at BEFORE UPDATE ON prakriti_vikriti_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_diagnoses_updated_at BEFORE UPDATE ON diagnoses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_treatment_protocols_updated_at BEFORE UPDATE ON treatment_protocols FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patient_protocol_assignments_updated_at BEFORE UPDATE ON patient_protocol_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_protocol_sessions_updated_at BEFORE UPDATE ON protocol_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stock_movements_updated_at BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_articles_updated_at BEFORE UPDATE ON content_articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_herb_database_updated_at BEFORE UPDATE ON herb_database FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_consent_logs_updated_at BEFORE UPDATE ON consent_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_data_access_logs_updated_at BEFORE UPDATE ON data_access_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notification_broadcasts_updated_at BEFORE UPDATE ON notification_broadcasts FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 4. CLINICAL ACTIONS TRIGGER: Log EMR / prescribing changes to data_access_logs
-- =============================================================================

CREATE OR REPLACE FUNCTION log_clinical_data_access()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_patient_id UUID;
  v_doctor_id UUID;
BEGIN
  -- Extract patient_id and doctor_id safely if they exist
  BEGIN
    v_patient_id := NEW.patient_id;
  EXCEPTION WHEN OTHERS THEN
    v_patient_id := NULL;
  END;

  BEGIN
    v_doctor_id := NEW.doctor_id;
  EXCEPTION WHEN OTHERS THEN
    v_doctor_id := NULL;
  END;

  INSERT INTO data_access_logs (patient_id, doctor_id, accessed_by, purpose, record_type, record_id)
  VALUES (
    v_patient_id,
    v_doctor_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), -- default system uuid if anonymous/background
    TG_OP || ' ' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Attach loggers to EMR and clinical updates
CREATE TRIGGER trg_log_ashtavidha BEFORE INSERT OR UPDATE ON ashtavidha_pariksha_records FOR EACH ROW EXECUTE FUNCTION log_clinical_data_access();
CREATE TRIGGER trg_log_prakriti BEFORE INSERT OR UPDATE ON prakriti_vikriti_profiles FOR EACH ROW EXECUTE FUNCTION log_clinical_data_access();
CREATE TRIGGER trg_log_diagnoses BEFORE INSERT OR UPDATE ON diagnoses FOR EACH ROW EXECUTE FUNCTION log_clinical_data_access();
CREATE TRIGGER trg_log_protocols BEFORE INSERT OR UPDATE ON patient_protocol_assignments FOR EACH ROW EXECUTE FUNCTION log_clinical_data_access();
CREATE TRIGGER trg_log_sessions BEFORE INSERT OR UPDATE ON protocol_sessions FOR EACH ROW EXECUTE FUNCTION log_clinical_data_access();


-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ashtavidha_pariksha_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prakriti_vikriti_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_protocol_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE herb_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_broadcasts ENABLE ROW LEVEL SECURITY;

-- Security Helpers
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS VARCHAR AS $$
  SELECT role::VARCHAR FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_doctor_profile_id()
RETURNS UUID AS $$
  SELECT id FROM doctor_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_patient_profile_id()
RETURNS UUID AS $$
  SELECT id FROM patient_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 5.1 doctor_profiles
CREATE POLICY doctor_profiles_select ON doctor_profiles FOR SELECT TO authenticated USING (true); -- everyone can view doctor cards/list
CREATE POLICY doctor_profiles_insert ON doctor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR get_my_role() = 'admin');
CREATE POLICY doctor_profiles_update ON doctor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- 5.2 doctor_verifications
CREATE POLICY doctor_verifications_select ON doctor_verifications FOR SELECT TO authenticated 
  USING (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY doctor_verifications_insert ON doctor_verifications FOR INSERT TO authenticated 
  WITH CHECK (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY doctor_verifications_all ON doctor_verifications FOR ALL TO authenticated 
  USING (get_my_role() = 'admin');

-- 5.3 doctor_availability_templates
CREATE POLICY doctor_availability_select ON doctor_availability_templates FOR SELECT TO authenticated USING (true); -- patients need availability slots
CREATE POLICY doctor_availability_all ON doctor_availability_templates FOR ALL TO authenticated 
  USING (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

-- 5.4 patient_profiles
CREATE POLICY patient_profiles_select ON patient_profiles FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR 
    get_my_role() = 'admin' OR 
    (get_my_role() = 'doctor' AND EXISTS (
       SELECT 1 FROM appointments a 
       WHERE a.patient_profile_id = patient_profiles.id 
       AND a.doctor_profile_id = get_my_doctor_profile_id()
    ))
  );
CREATE POLICY patient_profiles_insert ON patient_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR get_my_role() = 'admin');
CREATE POLICY patient_profiles_update ON patient_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR get_my_role() = 'admin');

-- 5.5 patient_family_members
CREATE POLICY patient_fam_select ON patient_family_members FOR SELECT TO authenticated 
  USING (
    patient_id = get_my_patient_profile_id() OR 
    get_my_role() = 'admin' OR 
    (get_my_role() = 'doctor' AND EXISTS (
       SELECT 1 FROM appointments a 
       WHERE a.patient_profile_id = patient_family_members.patient_id 
       AND a.doctor_profile_id = get_my_doctor_profile_id()
    ))
  );
CREATE POLICY patient_fam_write ON patient_family_members FOR ALL TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR get_my_role() = 'admin');

-- 5.6 branches, rooms, therapists, therapist_availability_templates
CREATE POLICY branches_select ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY branches_admin ON branches FOR ALL TO authenticated USING (get_my_role() = 'admin');

CREATE POLICY rooms_select ON rooms FOR SELECT TO authenticated USING (get_my_role() IN ('admin', 'doctor', 'intern_staff'));
CREATE POLICY rooms_admin ON rooms FOR ALL TO authenticated USING (get_my_role() = 'admin');

CREATE POLICY therapists_select ON therapists FOR SELECT TO authenticated USING (true);
CREATE POLICY therapists_admin ON therapists FOR ALL TO authenticated USING (get_my_role() = 'admin');

CREATE POLICY therapist_avail_select ON therapist_availability_templates FOR SELECT TO authenticated USING (get_my_role() IN ('admin', 'doctor', 'intern_staff'));
CREATE POLICY therapist_avail_admin ON therapist_availability_templates FOR ALL TO authenticated USING (get_my_role() = 'admin');

-- 5.7 appointment_status_history
CREATE POLICY app_status_hist_select ON appointment_status_history FOR SELECT TO authenticated 
  USING (
    get_my_role() = 'admin' OR 
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.id = appointment_id 
      AND (a.patient_profile_id = get_my_patient_profile_id() OR a.doctor_profile_id = get_my_doctor_profile_id())
    )
  );
CREATE POLICY app_status_hist_insert ON appointment_status_history FOR INSERT TO authenticated 
  WITH CHECK (get_my_role() IN ('admin', 'doctor', 'intern_staff'));

-- 5.8 ashtavidha_pariksha_records, prakriti_vikriti_profiles, diagnoses
CREATE POLICY ashtavidha_select ON ashtavidha_pariksha_records FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY ashtavidha_write ON ashtavidha_pariksha_records FOR ALL TO authenticated 
  USING (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

CREATE POLICY prakriti_select ON prakriti_vikriti_profiles FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY prakriti_write ON prakriti_vikriti_profiles FOR ALL TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

CREATE POLICY diagnoses_select ON diagnoses FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY diagnoses_write ON diagnoses FOR ALL TO authenticated 
  USING (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

-- 5.9 treatment_protocols
CREATE POLICY treatment_protocols_select ON treatment_protocols FOR SELECT TO authenticated USING (true);
CREATE POLICY treatment_protocols_admin ON treatment_protocols FOR ALL TO authenticated USING (get_my_role() = 'admin');

-- 5.10 patient_protocol_assignments, protocol_sessions
CREATE POLICY protocol_assign_select ON patient_protocol_assignments FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY protocol_assign_write ON patient_protocol_assignments FOR ALL TO authenticated 
  USING (doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

CREATE POLICY protocol_sessions_select ON protocol_sessions FOR SELECT TO authenticated 
  USING (
    get_my_role() IN ('admin', 'intern_staff') OR 
    EXISTS (
      SELECT 1 FROM patient_protocol_assignments pa 
      WHERE pa.id = assignment_id 
      AND (pa.patient_id = get_my_patient_profile_id() OR pa.doctor_id = get_my_doctor_profile_id())
    )
  );
CREATE POLICY protocol_sessions_write ON protocol_sessions FOR ALL TO authenticated 
  USING (
    get_my_role() IN ('admin', 'intern_staff') OR 
    EXISTS (
      SELECT 1 FROM patient_protocol_assignments pa 
      WHERE pa.id = assignment_id 
      AND pa.doctor_id = get_my_doctor_profile_id()
    )
  );

-- 5.11 Suppliers, Inventory, Stock Movements
CREATE POLICY suppliers_all ON suppliers FOR ALL TO authenticated 
  USING (get_my_role() IN ('admin', 'intern_staff'));

CREATE POLICY inventory_select ON inventory_items FOR SELECT TO authenticated 
  USING (get_my_role() IN ('admin', 'intern_staff', 'doctor'));
CREATE POLICY inventory_write ON inventory_items FOR ALL TO authenticated 
  USING (get_my_role() IN ('admin', 'intern_staff'));

CREATE POLICY stock_mov_select ON stock_movements FOR SELECT TO authenticated 
  USING (get_my_role() IN ('admin', 'intern_staff'));
CREATE POLICY stock_mov_write ON stock_movements FOR ALL TO authenticated 
  USING (get_my_role() IN ('admin', 'intern_staff'));

-- 5.12 Reviews
CREATE POLICY reviews_select ON reviews FOR SELECT TO authenticated USING (is_visible = true);
CREATE POLICY reviews_write ON reviews FOR ALL TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR get_my_role() = 'admin');

-- 5.13 Content Articles, Herb Database
CREATE POLICY content_select ON content_articles FOR SELECT TO authenticated USING (is_published = true OR get_my_role() IN ('admin', 'intern_staff'));
CREATE POLICY content_write ON content_articles FOR ALL TO authenticated USING (get_my_role() IN ('admin', 'intern_staff'));

CREATE POLICY herb_select ON herb_database FOR SELECT TO authenticated USING (true);
CREATE POLICY herb_write ON herb_database FOR ALL TO authenticated USING (get_my_role() IN ('admin', 'intern_staff'));

-- 5.14 Consent & Data Access Logs (ABDM Audits)
CREATE POLICY consent_logs_select ON consent_logs FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');
CREATE POLICY consent_logs_insert ON consent_logs FOR INSERT TO authenticated 
  WITH CHECK (patient_id = get_my_patient_profile_id() OR doctor_id = get_my_doctor_profile_id() OR get_my_role() = 'admin');

CREATE POLICY data_access_select ON data_access_logs FOR SELECT TO authenticated 
  USING (patient_id = get_my_patient_profile_id() OR get_my_role() = 'admin');
CREATE POLICY data_access_insert ON data_access_logs FOR INSERT TO authenticated 
  WITH CHECK (true); -- anyone can log data access events (triggered internally)

-- 5.15 Notification Broadcasts
CREATE POLICY broadcast_select ON notification_broadcasts FOR SELECT TO authenticated USING (true);
CREATE POLICY broadcast_admin ON notification_broadcasts FOR ALL TO authenticated USING (get_my_role() = 'admin');


-- =============================================================================
-- 6. SEED DATA (Classical Panchakarma Protocols)
-- =============================================================================

INSERT INTO treatment_protocols (id, name, description, sequence_steps) VALUES
(
  'aaaa1111-0000-0000-0000-000000000001',
  'Vamana Course',
  'Classical emesis therapy for Kapha disorders. Includes Purva Karma (Snehana + Swedana), Pradhana Karma (Vamana emesis), and Paschat Karma (Samsarjana Krama dietary progression).',
  '[
    {"step_name": "Abhyanga & Swedana", "phase": "Purva Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Abhyanga", "required_room_type": "Abhyanga"},
    {"step_name": "Abhyanga & Swedana", "phase": "Purva Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Abhyanga", "required_room_type": "Abhyanga"},
    {"step_name": "Vamana Day", "phase": "Pradhana Karma", "duration_minutes": 120, "min_rest_hours_after": 48, "required_therapist_specialization": "Abhyanga", "required_room_type": "generic"},
    {"step_name": "Samsarjana Krama Day 1", "phase": "Paschat Karma", "duration_minutes": 30, "min_rest_hours_after": 24, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Samsarjana Krama Day 2", "phase": "Paschat Karma", "duration_minutes": 30, "min_rest_hours_after": 24, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Samsarjana Krama Day 3", "phase": "Paschat Karma", "duration_minutes": 30, "min_rest_hours_after": 0, "required_therapist_specialization": "generic", "required_room_type": "generic"}
  ]'::jsonb
),
(
  'aaaa2222-0000-0000-0000-000000000002',
  'Virechana Course',
  'Classical purgation therapy for Pitta disorders. Purifies liver, gallbladder, and small intestine.',
  '[
    {"step_name": "Snehapana (Internal Oleation)", "phase": "Purva Karma", "duration_minutes": 30, "min_rest_hours_after": 24, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Abhyanga & Swedana", "phase": "Purva Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Abhyanga", "required_room_type": "Abhyanga"},
    {"step_name": "Virechana Day", "phase": "Pradhana Karma", "duration_minutes": 90, "min_rest_hours_after": 48, "required_therapist_specialization": "Abhyanga", "required_room_type": "generic"},
    {"step_name": "Samsarjana Krama Day 1", "phase": "Paschat Karma", "duration_minutes": 30, "min_rest_hours_after": 24, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Samsarjana Krama Day 2", "phase": "Paschat Karma", "duration_minutes": 30, "min_rest_hours_after": 0, "required_therapist_specialization": "generic", "required_room_type": "generic"}
  ]'::jsonb
),
(
  'aaaa3333-0000-0000-0000-000000000003',
  'Basti Course (Alternating)',
  '8-day Karma Basti course for Vata disorders, alternating Anuvasana (oil) and Niruha (decoction) enemas.',
  '[
    {"step_name": "Anuvasana Basti (Oil) Day 1", "phase": "Pradhana Karma", "duration_minutes": 45, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Niruha Basti (Decoction) Day 2", "phase": "Pradhana Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Anuvasana Basti Day 3", "phase": "Pradhana Karma", "duration_minutes": 45, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Niruha Basti Day 4", "phase": "Pradhana Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Anuvasana Basti Day 5", "phase": "Pradhana Karma", "duration_minutes": 45, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Niruha Basti Day 6", "phase": "Pradhana Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Anuvasana Basti Day 7", "phase": "Pradhana Karma", "duration_minutes": 45, "min_rest_hours_after": 24, "required_therapist_specialization": "Basti", "required_room_type": "Basti"},
    {"step_name": "Anuvasana Basti Day 8", "phase": "Pradhana Karma", "duration_minutes": 45, "min_rest_hours_after": 0, "required_therapist_specialization": "Basti", "required_room_type": "Basti"}
  ]'::jsonb
),
(
  'aaaa4444-0000-0000-0000-000000000004',
  'Nasya Course',
  'Administration of medicated oils/herbs via nasal passages to clear toxins from head and neck.',
  '[
    {"step_name": "Mukha Abhyanga & Svedana", "phase": "Purva Karma", "duration_minutes": 30, "min_rest_hours_after": 1, "required_therapist_specialization": "Abhyanga", "required_room_type": "Abhyanga"},
    {"step_name": "Nasya Karma Drops", "phase": "Pradhana Karma", "duration_minutes": 20, "min_rest_hours_after": 2, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Kavala & Gandusha (Gargling)", "phase": "Paschat Karma", "duration_minutes": 15, "min_rest_hours_after": 0, "required_therapist_specialization": "generic", "required_room_type": "generic"}
  ]'::jsonb
),
(
  'aaaa5555-0000-0000-0000-000000000005',
  'Raktamokshana Course',
  'Therapeutic bloodletting using classical Leech therapy (Jalaukavacharana) for localized blood disorders and skin concerns.',
  '[
    {"step_name": "Snehana Swedana (Local)", "phase": "Purva Karma", "duration_minutes": 20, "min_rest_hours_after": 1, "required_therapist_specialization": "Abhyanga", "required_room_type": "Abhyanga"},
    {"step_name": "Leech Application (Jalauka)", "phase": "Pradhana Karma", "duration_minutes": 60, "min_rest_hours_after": 24, "required_therapist_specialization": "generic", "required_room_type": "generic"},
    {"step_name": "Haridra Lepa & Dressing", "phase": "Paschat Karma", "duration_minutes": 15, "min_rest_hours_after": 0, "required_therapist_specialization": "generic", "required_room_type": "generic"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
