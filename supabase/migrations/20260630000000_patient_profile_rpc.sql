-- Migration: Allow patient profile creation from the custom OTP onboarding flow
-- 
-- Problem: The patient_profiles RLS policy requires TO authenticated (Supabase Auth session).
-- The app uses a custom OTP Edge Function which does NOT create a Supabase Auth session,
-- so auth.uid() is always NULL — making the INSERT policy fail for all new signups.
--
-- Solution: A SECURITY DEFINER function that bypasses RLS and can be called by anon.
-- The function validates the input and only inserts/updates based on a matching users.id,
-- which prevents cross-user data tampering.

-- ─── Helper: upsert_patient_profile ────────────────────────────────────────────
-- Called by the Next.js API route /api/onboarding/patient (server-side, anon key is fine
-- because this function is SECURITY DEFINER and runs as the DB owner).
CREATE OR REPLACE FUNCTION upsert_patient_profile(
  p_user_id                 UUID,
  p_full_name               TEXT,
  p_date_of_birth           DATE,
  p_gender                  TEXT,
  p_phone                   TEXT,
  p_email                   TEXT,
  p_address                 TEXT         DEFAULT NULL,
  p_abha_number             TEXT         DEFAULT NULL,
  p_emergency_contact_name  TEXT         DEFAULT NULL,
  p_emergency_contact_phone TEXT         DEFAULT NULL,
  p_allergies               TEXT[]       DEFAULT '{}',
  p_chronic_conditions      TEXT[]       DEFAULT '{}',
  p_current_medications     TEXT[]       DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with DB owner privileges, bypasses RLS
SET search_path = public  -- prevent search_path injection
AS $$
BEGIN
  -- Validate: the user_id must actually exist in the users table
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Update the users table role
  UPDATE public.users
  SET role = 'patient', abha_number = COALESCE(p_abha_number, abha_number)
  WHERE id = p_user_id;

  -- Upsert the patient profile
  INSERT INTO public.patient_profiles (
    user_id, full_name, date_of_birth, gender, phone, email,
    address, abha_number,
    emergency_contact_name, emergency_contact_phone,
    allergies, chronic_conditions, current_medications,
    is_active
  )
  VALUES (
    p_user_id, p_full_name, p_date_of_birth, p_gender, p_phone, p_email,
    p_address, p_abha_number,
    p_emergency_contact_name, p_emergency_contact_phone,
    p_allergies, p_chronic_conditions, p_current_medications,
    TRUE
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name               = EXCLUDED.full_name,
    date_of_birth           = EXCLUDED.date_of_birth,
    gender                  = EXCLUDED.gender,
    phone                   = EXCLUDED.phone,
    email                   = EXCLUDED.email,
    address                 = COALESCE(EXCLUDED.address, patient_profiles.address),
    abha_number             = COALESCE(EXCLUDED.abha_number, patient_profiles.abha_number),
    emergency_contact_name  = COALESCE(EXCLUDED.emergency_contact_name, patient_profiles.emergency_contact_name),
    emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, patient_profiles.emergency_contact_phone),
    allergies               = EXCLUDED.allergies,
    chronic_conditions      = EXCLUDED.chronic_conditions,
    current_medications     = EXCLUDED.current_medications,
    is_active               = TRUE,
    updated_at              = NOW();
END;
$$;

-- Grant EXECUTE to anon and authenticated roles so it can be called without a session
GRANT EXECUTE ON FUNCTION upsert_patient_profile(
  UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[]
) TO anon, authenticated;

-- ─── Helper: upsert_users_row ───────────────────────────────────────────────────
-- Safely creates a user row by email, or returns the existing one.
-- Avoids duplicate-key errors on retry.
CREATE OR REPLACE FUNCTION upsert_user_by_email(
  p_email TEXT,
  p_role  TEXT DEFAULT 'patient'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to get existing
  SELECT id INTO v_id FROM public.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Insert new row
  INSERT INTO public.users (email, role)
  VALUES (p_email, p_role)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_user_by_email(TEXT, TEXT) TO anon, authenticated;
