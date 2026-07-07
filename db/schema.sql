-- =============================================================================
-- MeyVeda — Complete Relational Database Schema
-- PostgreSQL 15+
-- India's First AYUSH Digital Health Platform
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'patient', 'practitioner', 'clinic_admin',
  'receptionist', 'pharmacy', 'super_admin'
);

CREATE TYPE ayush_discipline AS ENUM (
  'Ayurveda', 'Yoga', 'Naturopathy',
  'Unani', 'Siddha', 'Homeopathy'
);

CREATE TYPE verification_status AS ENUM (
  'pending', 'under_review', 'verified', 'rejected'
);

CREATE TYPE consult_mode AS ENUM ('video', 'clinic');

CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'checked_in', 'in_session',
  'completed', 'cancelled', 'no_show', 'rescheduled'
);

CREATE TYPE session_fallback AS ENUM ('none', 'audio_only', 'phone_call');

CREATE TYPE consent_action AS ENUM ('granted', 'denied', 'revoked', 'expired');

CREATE TYPE consent_duration AS ENUM (
  'session_only', '30_days', '90_days', 'until_revoked'
);

CREATE TYPE health_record_type AS ENUM (
  'consultation', 'prescription', 'lab',
  'tracker', 'ai_summary', 'external_abdm'
);

CREATE TYPE order_status AS ENUM (
  'placed', 'prescription_verified', 'packed',
  'dispatched', 'out_for_delivery', 'delivered',
  'cancelled', 'refund_initiated', 'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'success', 'failed', 'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'upi', 'card', 'net_banking', 'cod', 'wallet'
);

CREATE TYPE refund_reason AS ENUM (
  'patient_cancelled', 'doctor_cancelled', 'no_show_doctor',
  'payment_error', 'order_cancelled', 'admin_override'
);

CREATE TYPE prakriti_type AS ENUM (
  'Vata', 'Pitta', 'Kapha',
  'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridosha'
);

CREATE TYPE agni_type AS ENUM ('Sama', 'Vishama', 'Teekshna', 'Manda');

CREATE TYPE dinacharya_category AS ENUM (
  'diet', 'exercise', 'mindfulness', 'medicine', 'sleep', 'hygiene'
);

CREATE TYPE reminder_type AS ENUM (
  'appointment_24h', 'appointment_1h', 'appointment_15m',
  'follow_up_nudge', 'follow_up_ai_checkin',
  'medicine_dose', 'refill_due', 'wellness_checkin',
  'order_status', 're_engagement'
);

CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'email', 'in_app');

CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE relationship AS ENUM (
  'self', 'spouse', 'parent', 'child', 'sibling', 'other'
);

CREATE TYPE prescription_status AS ENUM (
  'draft', 'finalized', 'signed', 'dispensed', 'cancelled'
);

CREATE TYPE message_direction AS ENUM ('patient_to_doctor', 'doctor_to_patient');

CREATE TYPE wellness_response AS ENUM ('better', 'same', 'worse');

CREATE TYPE slot_status AS ENUM ('open', 'locked', 'booked', 'blocked', 'completed');


-- =============================================================================
-- MODULE 1: USERS & IDENTITY
-- =============================================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile          VARCHAR(15) NOT NULL UNIQUE,
  email           VARCHAR(255) UNIQUE,
  role            user_role NOT NULL,
  language_pref   VARCHAR(20) NOT NULL DEFAULT 'en',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  tos_accepted_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ABHA (Ayushman Bharat Health Account) links
CREATE TABLE abha_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  abha_id         VARCHAR(17) NOT NULL UNIQUE,     -- XX-XXXX-XXXX-XXXX format
  abha_address    VARCHAR(255) UNIQUE,              -- name@abdm
  aadhaar_masked  VARCHAR(12),                      -- last 4 digits only stored
  full_name       VARCHAR(255) NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          gender NOT NULL,
  mobile_linked   VARCHAR(15),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_abha_links_user ON abha_links(user_id);


-- =============================================================================
-- MODULE 2: PATIENTS
-- =============================================================================

CREATE TABLE patients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  full_name       VARCHAR(255) NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          gender NOT NULL,
  city            VARCHAR(100),
  pin_code        VARCHAR(10),
  profile_photo   TEXT,                 -- S3 URL
  prakriti        prakriti_type,
  wellness_goals  TEXT[],              -- array of tags e.g. {'Sleep','Digestion'}
  discipline_prefs ayush_discipline[],
  drop_off_nudge_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user ON patients(user_id);

-- Family members linked to a primary patient account
CREATE TABLE family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  relationship    relationship NOT NULL,
  date_of_birth   DATE NOT NULL,
  gender          gender NOT NULL,
  abha_id         VARCHAR(17),          -- optional ABHA link for this member
  prakriti        prakriti_type,
  is_minor        BOOLEAN GENERATED ALWAYS AS (
                    EXTRACT(YEAR FROM AGE(date_of_birth)) < 18
                  ) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_family_members_owner ON family_members(owner_patient_id);


-- =============================================================================
-- MODULE 3: PRACTITIONERS
-- =============================================================================

CREATE TABLE practitioners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  full_name           VARCHAR(255) NOT NULL,
  gender              gender,
  profile_photo       TEXT,
  bio                 TEXT,
  languages           TEXT[] NOT NULL DEFAULT '{}',
  disciplines         ayush_discipline[] NOT NULL,
  specializations     TEXT[],              -- e.g. {'Panchakarma','Spine Rehab'}
  qualifications      TEXT[] NOT NULL DEFAULT '{}',   -- e.g. {'BAMS','MD Ayurveda'}
  experience_years    SMALLINT NOT NULL DEFAULT 0,
  hpr_id              VARCHAR(20) UNIQUE,  -- Health Professional Registry ID
  hpr_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  hip_registered      BOOLEAN NOT NULL DEFAULT FALSE,  -- ABDM Health Info Provider
  reg_council         VARCHAR(150),        -- e.g. 'Central Council of Indian Medicine'
  reg_number          VARCHAR(50),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  rejection_reason    TEXT,
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  consultation_count  INTEGER NOT NULL DEFAULT 0,
  base_video_fee      INTEGER NOT NULL DEFAULT 0,  -- in paise (INR × 100)
  base_clinic_fee     INTEGER NOT NULL DEFAULT 0,
  followup_fee_pct    SMALLINT NOT NULL DEFAULT 50,  -- % of base fee for follow-ups ≤7 days
  slot_duration_min   SMALLINT NOT NULL DEFAULT 20,
  buffer_min          SMALLINT NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practitioners_discipline ON practitioners USING GIN(disciplines);
CREATE INDEX idx_practitioners_languages ON practitioners USING GIN(languages);
CREATE INDEX idx_practitioners_status ON practitioners(verification_status);

-- Credential documents uploaded during verification
CREATE TABLE verification_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  doc_type        VARCHAR(50) NOT NULL,  -- 'degree','registration','identity','photo'
  file_url        TEXT NOT NULL,         -- S3 URL
  file_name       VARCHAR(255),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id)
);

CREATE INDEX idx_verdocs_practitioner ON verification_documents(practitioner_id);


-- =============================================================================
-- MODULE 4: CLINICS
-- =============================================================================

CREATE TABLE clinics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  address_line1       VARCHAR(255) NOT NULL,
  address_line2       VARCHAR(255),
  city                VARCHAR(100) NOT NULL,
  state               VARCHAR(100) NOT NULL,
  pin_code            VARCHAR(10) NOT NULL,
  geo_lat             NUMERIC(9,6),
  geo_lng             NUMERIC(9,6),
  phone               VARCHAR(15),
  hfr_id              VARCHAR(30),    -- Health Facility Registry ID
  hfr_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  profile_photo       TEXT,
  parking_notes       TEXT,
  entry_instructions  TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clinics_city ON clinics(city);

-- Doctor ↔ Clinic association (a doctor can work at multiple clinics)
CREATE TABLE clinic_practitioners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  room_number     VARCHAR(20),
  in_clinic_fee   INTEGER,   -- override; NULL means use practitioner base_clinic_fee
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(clinic_id, practitioner_id)
);

CREATE INDEX idx_clinic_practitioners_clinic ON clinic_practitioners(clinic_id);
CREATE INDEX idx_clinic_practitioners_practitioner ON clinic_practitioners(practitioner_id);

-- Clinic staff (receptionists, admins)
CREATE TABLE clinic_staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            user_role NOT NULL,  -- 'receptionist' or 'clinic_admin'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(clinic_id, user_id)
);


-- =============================================================================
-- MODULE 5: SCHEDULING & SLOTS
-- =============================================================================

-- Weekly recurring schedule per practitioner (and optionally per clinic)
CREATE TABLE availability_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  clinic_id       UUID REFERENCES clinics(id),  -- NULL = video slots
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Mon
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_start     TIME,
  break_end       TIME,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(practitioner_id, clinic_id, day_of_week)
);

CREATE INDEX idx_schedules_practitioner ON availability_schedules(practitioner_id);

-- Specific date blocks (vacations, emergencies)
CREATE TABLE blocked_dates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  clinic_id       UUID REFERENCES clinics(id),
  block_date      DATE NOT NULL,
  reason          VARCHAR(50),   -- 'personal','travel','medical','other'
  blocked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocked_dates_practitioner_date ON blocked_dates(practitioner_id, block_date);

-- Individual generated booking slots
CREATE TABLE slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  clinic_id       UUID REFERENCES clinics(id),   -- NULL = video slot
  mode            consult_mode NOT NULL,
  slot_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  status          slot_status NOT NULL DEFAULT 'open',
  locked_until    TIMESTAMPTZ,    -- 8-min lock during booking checkout
  locked_by       UUID REFERENCES users(id),
  fee             INTEGER NOT NULL,   -- in paise, computed at slot creation
  UNIQUE(practitioner_id, clinic_id, slot_date, start_time, mode)
);

CREATE INDEX idx_slots_practitioner_date ON slots(practitioner_id, slot_date);
CREATE INDEX idx_slots_status ON slots(status);


-- =============================================================================
-- MODULE 6: APPOINTMENTS
-- =============================================================================

CREATE TABLE appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id             UUID NOT NULL REFERENCES slots(id),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  family_member_id    UUID REFERENCES family_members(id),  -- if booking for family
  clinic_id           UUID REFERENCES clinics(id),
  mode                consult_mode NOT NULL,
  status              appointment_status NOT NULL DEFAULT 'scheduled',
  reason_for_visit    TEXT,
  is_followup         BOOLEAN NOT NULL DEFAULT FALSE,
  parent_appointment_id UUID REFERENCES appointments(id),  -- links to prior consult
  booked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_date      DATE NOT NULL,
  scheduled_time      TIME NOT NULL,
  checked_in_at       TIMESTAMPTZ,
  session_started_at  TIMESTAMPTZ,
  session_ended_at    TIMESTAMPTZ,
  duration_min        SMALLINT,
  noshow_marked_at    TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by        UUID REFERENCES users(id),
  rescheduled_from_id UUID REFERENCES appointments(id)
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id, scheduled_date);
CREATE INDEX idx_appointments_practitioner ON appointments(practitioner_id, scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Files uploaded by patient pre-appointment
CREATE TABLE appointment_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       VARCHAR(255),
  file_type       VARCHAR(20),   -- 'pdf','image'
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlist for fully-booked slots
CREATE TABLE waitlist_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  family_member_id    UUID REFERENCES family_members(id),
  clinic_id           UUID REFERENCES clinics(id),
  mode                consult_mode NOT NULL,
  waitlist_date       DATE NOT NULL,
  position            SMALLINT NOT NULL,
  notified_at         TIMESTAMPTZ,
  priority_expires_at TIMESTAMPTZ,   -- 30-min window after cancellation slot opens
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(practitioner_id, patient_id, waitlist_date)
);


-- =============================================================================
-- MODULE 7: PAYMENTS & REFUNDS
-- =============================================================================

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID REFERENCES appointments(id),
  order_id            UUID,              -- FK added after orders table (see below)
  user_id             UUID NOT NULL REFERENCES users(id),
  amount_paise        INTEGER NOT NULL,  -- total in paise
  consult_fee_paise   INTEGER,
  convenience_fee_paise INTEGER DEFAULT 0,
  gst_paise           INTEGER DEFAULT 0,
  discount_paise      INTEGER DEFAULT 0,
  method              payment_method NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  gateway             VARCHAR(50),       -- 'razorpay','phonepe','stripe'
  gateway_order_id    VARCHAR(255),
  gateway_payment_id  VARCHAR(255),
  gateway_signature   VARCHAR(512),
  promo_code          VARCHAR(50),
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE refunds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id      UUID NOT NULL REFERENCES payments(id),
  amount_paise    INTEGER NOT NULL,
  reason          refund_reason NOT NULL,
  initiated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  gateway_refund_id VARCHAR(255),
  status          payment_status NOT NULL DEFAULT 'pending'
);


-- =============================================================================
-- MODULE 8: CONSULTATIONS & EMR
-- =============================================================================

CREATE TABLE consultations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT UNIQUE,
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  family_member_id    UUID REFERENCES family_members(id),
  mode                consult_mode NOT NULL,
  fallback_used       session_fallback NOT NULL DEFAULT 'none',
  identity_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,
  session_start       TIMESTAMPTZ,
  session_end         TIMESTAMPTZ,
  duration_min        SMALLINT,
  recording_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url       TEXT,
  is_complete         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_practitioner ON consultations(practitioner_id);

-- SOAP + AYUSH clinical notes
CREATE TABLE emr_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id     UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE UNIQUE,
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  -- SOAP fields
  chief_complaint     TEXT,
  history_present     TEXT,    -- History of Present Illness
  past_medical_hx     TEXT,
  family_history      TEXT,
  allergies           TEXT,
  current_medications TEXT,
  objective_findings  TEXT,
  assessment          TEXT,    -- AYUSH diagnostic impression
  plan                TEXT,
  -- AYUSH Assessment
  prakriti            prakriti_type,
  nadi_pariksha       TEXT,    -- Pulse analysis notes
  jihva_pariksha      TEXT,    -- Tongue findings
  agni                agni_type,
  mala_notes          TEXT,
  mutra_notes         TEXT,
  drik_notes          TEXT,
  akruti_notes        TEXT,
  -- Lifecycle
  template_used       VARCHAR(100),
  is_draft            BOOLEAN NOT NULL DEFAULT TRUE,
  finalized_at        TIMESTAMPTZ,
  -- Patient-facing summary generated by AI from clinical notes
  patient_summary     TEXT,
  summary_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files attached to an EMR note (lab images, Prakriti charts, etc.)
CREATE TABLE emr_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emr_note_id     UUID NOT NULL REFERENCES emr_notes(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       VARCHAR(255),
  file_type       VARCHAR(20),
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- MODULE 9: PRESCRIPTIONS
-- =============================================================================

-- Master AYUSH medicine / formulation catalogue
CREATE TABLE medicines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  generic_name    VARCHAR(255),
  discipline      ayush_discipline NOT NULL,
  category        VARCHAR(100),   -- e.g. 'Churna','Kwath','Arka','Dilution'
  pharmacopoeia   VARCHAR(100),   -- 'API','UP','HP'
  standard_dose   VARCHAR(100),
  standard_dose_min NUMERIC(8,3),
  standard_dose_max NUMERIC(8,3),
  dose_unit       VARCHAR(20),    -- 'mg','tsp','drops','tabs'
  is_controlled   BOOLEAN NOT NULL DEFAULT FALSE,  -- requires re-auth per order
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicines_name ON medicines USING GIN(to_tsvector('english', name));
CREATE INDEX idx_medicines_discipline ON medicines(discipline);

CREATE TABLE prescriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id     UUID NOT NULL REFERENCES consultations(id),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  family_member_id    UUID REFERENCES family_members(id),
  abha_locker_pushed  BOOLEAN NOT NULL DEFAULT FALSE,
  status              prescription_status NOT NULL DEFAULT 'draft',
  dietary_advice      TEXT,
  lifestyle_advice    TEXT,
  physical_activity   TEXT,
  followup_date       DATE,
  signed_at           TIMESTAMPTZ,
  esign_method        VARCHAR(20),   -- 'biometric','pin'
  pdf_url             TEXT,
  qr_code_url         TEXT,
  version             SMALLINT NOT NULL DEFAULT 1,  -- amended prescriptions bump version
  parent_prescription_id UUID REFERENCES prescriptions(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_consultation ON prescriptions(consultation_id);

CREATE TABLE prescription_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id     UUID REFERENCES medicines(id),
  medicine_name   VARCHAR(255) NOT NULL,   -- stored directly for immutability
  dose            VARCHAR(100) NOT NULL,
  frequency       VARCHAR(100) NOT NULL,   -- 'Once','Twice','Thrice','At bedtime'
  duration_days   SMALLINT NOT NULL,
  anupana         VARCHAR(150),            -- vehicle: 'Warm milk','Honey','Ghee'
  special_instructions TEXT,
  sort_order      SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_rx_items_prescription ON prescription_items(prescription_id);


-- =============================================================================
-- MODULE 10: CARE PLANS & FOLLOW-UPS
-- =============================================================================

CREATE TABLE care_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) UNIQUE,
  prescription_id UUID REFERENCES prescriptions(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  followup_date   DATE,
  followup_reason TEXT,
  monitoring_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE care_plan_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id    UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  category        dinacharya_category NOT NULL,
  sort_order      SMALLINT NOT NULL DEFAULT 0
);

-- Follow-up tracking per patient-practitioner pair
CREATE TABLE follow_ups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  care_plan_id        UUID REFERENCES care_plans(id),
  recommended_date    DATE NOT NULL,
  nudge_sent_at       TIMESTAMPTZ,
  second_nudge_sent_at TIMESTAMPTZ,
  ai_checkin_sent_at  TIMESTAMPTZ,
  booked_appointment_id UUID REFERENCES appointments(id),
  is_booked           BOOLEAN GENERATED ALWAYS AS (booked_appointment_id IS NOT NULL) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_patient ON follow_ups(patient_id, recommended_date);
CREATE INDEX idx_follow_ups_practitioner ON follow_ups(practitioner_id);


-- =============================================================================
-- MODULE 11: HEALTH RECORDS & CONSENT (ABDM)
-- =============================================================================

CREATE TABLE health_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_member_id    UUID REFERENCES family_members(id),
  record_type         health_record_type NOT NULL,
  title               VARCHAR(255) NOT NULL,
  summary             TEXT,
  -- FK links to source entities (only one will be set)
  consultation_id     UUID REFERENCES consultations(id),
  prescription_id     UUID REFERENCES prescriptions(id),
  -- For ABDM-pulled records from external facilities
  source_facility     VARCHAR(255),
  source_hfr_id       VARCHAR(30),
  abdm_record_id      VARCHAR(255),
  -- Practitioner who created this record (if internal)
  practitioner_id     UUID REFERENCES practitioners(id),
  discipline          ayush_discipline,
  record_date         DATE NOT NULL,
  is_external         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_patient ON health_records(patient_id, record_date DESC);
CREATE INDEX idx_health_records_type ON health_records(record_type);

CREATE TABLE health_record_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_record_id UUID NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       VARCHAR(255),
  file_type       VARCHAR(20),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ABDM consent grants — audit trail, permanent, non-deletable
CREATE TABLE consent_grants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  family_member_id    UUID REFERENCES family_members(id),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  appointment_id      UUID REFERENCES appointments(id),
  action              consent_action NOT NULL,
  duration            consent_duration,
  record_types        health_record_type[],
  date_range_from     DATE,
  date_range_to       DATE,
  expires_at          TIMESTAMPTZ,
  abdm_consent_id     VARCHAR(255),    -- ABDM-issued consent artefact ID
  revoked_at          TIMESTAMPTZ,
  revoked_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_grants_patient ON consent_grants(patient_id);
CREATE INDEX idx_consent_grants_practitioner ON consent_grants(practitioner_id);


-- =============================================================================
-- MODULE 12: APOTHECARY (MEDICINE ORDERS)
-- =============================================================================

CREATE TABLE pharmacy_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  name            VARCHAR(255) NOT NULL,
  license_number  VARCHAR(100),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  api_endpoint    TEXT,
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(15),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE patient_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label           VARCHAR(50),     -- 'Home','Work','Other'
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(15) NOT NULL,
  address_line1   VARCHAR(255) NOT NULL,
  address_line2   VARCHAR(255),
  city            VARCHAR(100) NOT NULL,
  state           VARCHAR(100) NOT NULL,
  pin_code        VARCHAR(10) NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_addresses_patient ON patient_addresses(patient_id);

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  prescription_id     UUID REFERENCES prescriptions(id),
  pharmacy_id         UUID REFERENCES pharmacy_partners(id),
  address_id          UUID NOT NULL REFERENCES patient_addresses(id),
  status              order_status NOT NULL DEFAULT 'placed',
  subtotal_paise      INTEGER NOT NULL DEFAULT 0,
  delivery_fee_paise  INTEGER NOT NULL DEFAULT 0,
  discount_paise      INTEGER NOT NULL DEFAULT 0,
  total_paise         INTEGER NOT NULL DEFAULT 0,
  promo_code          VARCHAR(50),
  is_express          BOOLEAN NOT NULL DEFAULT FALSE,
  refill_order        BOOLEAN NOT NULL DEFAULT FALSE,
  parent_order_id     UUID REFERENCES orders(id),   -- for refill orders
  tracking_number     VARCHAR(100),
  logistics_partner   VARCHAR(100),
  estimated_delivery  DATE,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_prescription ON orders(prescription_id);

-- Backfill FK on payments
ALTER TABLE payments ADD CONSTRAINT fk_payments_order
  FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id         UUID REFERENCES medicines(id),
  medicine_name       VARCHAR(255) NOT NULL,
  quantity            SMALLINT NOT NULL DEFAULT 1,
  unit_price_paise    INTEGER NOT NULL,
  total_price_paise   INTEGER NOT NULL,
  is_prescription_item BOOLEAN NOT NULL DEFAULT FALSE,
  is_substitute       BOOLEAN NOT NULL DEFAULT FALSE,
  substituted_for_id  UUID REFERENCES order_items(id),
  substitute_approved_by UUID REFERENCES users(id),   -- pharmacist
  is_controlled       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          order_status NOT NULL,
  notes           TEXT,
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-refill schedule set by patient
CREATE TABLE refill_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  prescription_item_id UUID NOT NULL REFERENCES prescription_items(id),
  frequency_days  SMALLINT NOT NULL,
  next_refill_date DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- MODULE 13: DINACHARYA & WELLNESS TRACKING
-- =============================================================================

CREATE TABLE dinacharya_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id),
  title           VARCHAR(255) NOT NULL DEFAULT 'My Daily Routine',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dinacharya_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID NOT NULL REFERENCES dinacharya_plans(id) ON DELETE CASCADE,
  time_of_day     TIME,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  category        dinacharya_category NOT NULL,
  sort_order      SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE habit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES dinacharya_tasks(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at    TIMESTAMPTZ,
  is_done         BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(task_id, patient_id, log_date)
);

CREATE INDEX idx_habit_logs_patient_date ON habit_logs(patient_id, log_date);

-- Weekly AI wellness check-ins
CREATE TABLE wellness_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  ai_session_id   UUID,          -- FK to ai_chat_sessions added below
  response        wellness_response,
  notes           TEXT,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- MODULE 14: AI CHAT (AYURSANVAAD)
-- =============================================================================

CREATE TABLE ai_chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title           VARCHAR(255),
  is_emergency    BOOLEAN NOT NULL DEFAULT FALSE,
  practitioner_cta_shown BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_sessions_patient ON ai_chat_sessions(patient_id);

-- Backfill FK on wellness_checkins
ALTER TABLE wellness_checkins ADD CONSTRAINT fk_checkins_ai_session
  FOREIGN KEY (ai_session_id) REFERENCES ai_chat_sessions(id);

CREATE TABLE ai_chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user','ai')),
  content         TEXT NOT NULL,
  is_emergency    BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_session ON ai_chat_messages(session_id);


-- =============================================================================
-- MODULE 15: BOUNDED MESSAGING (DOCTOR–PATIENT)
-- =============================================================================

-- Messages allowed only within 48h post-consultation window
CREATE TABLE bounded_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id     UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_user_id      UUID NOT NULL REFERENCES users(id),
  direction           message_direction NOT NULL,
  content             TEXT NOT NULL,
  has_attachment      BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_url      TEXT,
  is_adverse_reaction BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at             TIMESTAMPTZ,
  responded_at        TIMESTAMPTZ
);

CREATE INDEX idx_bounded_messages_consultation ON bounded_messages(consultation_id);


-- =============================================================================
-- MODULE 16: NOTIFICATIONS & REMINDERS
-- =============================================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel         notification_channel NOT NULL,
  type            reminder_type,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  deep_link       TEXT,
  reference_id    UUID,    -- generic link to appointment/order/etc.
  reference_type  VARCHAR(50),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            reminder_type NOT NULL,
  reference_id    UUID NOT NULL,
  reference_type  VARCHAR(50) NOT NULL,
  fire_at         TIMESTAMPTZ NOT NULL,
  fired_at        TIMESTAMPTZ,
  is_cancelled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_fire_at ON reminders(fire_at) WHERE fired_at IS NULL AND is_cancelled = FALSE;


-- =============================================================================
-- MODULE 17: RATINGS & REVIEWS
-- =============================================================================

CREATE TABLE ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id     UUID NOT NULL REFERENCES consultations(id) UNIQUE,
  patient_id          UUID NOT NULL REFERENCES patients(id),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  stars               SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review_text         TEXT,
  is_visible          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_practitioner ON ratings(practitioner_id);


-- =============================================================================
-- MODULE 18: AUDIT LOG (SECURITY & COMPLIANCE)
-- =============================================================================

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID,
  patient_id      UUID REFERENCES patients(id),
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);


-- =============================================================================
-- TRIGGERS: updated_at auto-maintenance
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_practitioners_updated_at
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_emr_notes_updated_at
  BEFORE UPDATE ON emr_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- TRIGGER: Update practitioner rating on new rating insert
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_practitioner_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE practitioners
  SET
    rating_avg   = (SELECT ROUND(AVG(stars)::NUMERIC, 2) FROM ratings WHERE practitioner_id = NEW.practitioner_id),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE practitioner_id = NEW.practitioner_id)
  WHERE id = NEW.practitioner_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_rating
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION refresh_practitioner_rating();


-- =============================================================================
-- TRIGGER: Log consent events to audit_log
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_consent_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_logs(actor_user_id, action, entity_type, entity_id, patient_id, metadata)
  VALUES (
    NULL,
    'consent.' || NEW.action::TEXT,
    'consent_grants',
    NEW.id,
    NEW.patient_id,
    jsonb_build_object(
      'practitioner_id', NEW.practitioner_id,
      'duration', NEW.duration,
      'record_types', NEW.record_types
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_consent
  AFTER INSERT ON consent_grants
  FOR EACH ROW EXECUTE FUNCTION audit_consent_event();
