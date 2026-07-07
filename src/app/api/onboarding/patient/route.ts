import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client.
// Uses the service role key when available (bypasses RLS directly),
// otherwise falls back to anon key + our SECURITY DEFINER RPC functions
// which also bypass RLS safely.
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      fullName,
      dateOfBirth,
      gender,
      phone,
      address,
      abhaNumber,
      emergencyContactName,
      emergencyContactPhone,
      allergies,
      chronicConditions,
      currentMedications,
    } = body;

    // ── 1. Resolve or create the users row ──────────────────────────────────
    // Uses SECURITY DEFINER fn to safely upsert — no duplicate key errors.
    const { data: userIdData, error: userErr } = await supabase
      .rpc("upsert_user_by_email", {
        p_email: email,
        p_role:  "patient",
      });

    if (userErr) {
      console.error("[API] upsert_user_by_email error:", userErr);
      return NextResponse.json(
        { error: userErr.message },
        { status: 500 }
      );
    }

    const userId = userIdData as string;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to resolve user ID" },
        { status: 500 }
      );
    }

    // ── 2. Upsert patient profile via SECURITY DEFINER RPC ──────────────────
    // This bypasses the RLS policy which requires auth.uid() = user_id.
    const { error: profileErr } = await supabase.rpc(
      "upsert_patient_profile",
      {
        p_user_id:                 userId,
        p_full_name:               fullName,
        p_date_of_birth:           dateOfBirth,
        p_gender:                  gender,
        p_phone:                   phone        ?? "",
        p_email:                   email,
        p_address:                 address      ?? null,
        p_abha_number:             abhaNumber   ?? null,
        p_emergency_contact_name:  emergencyContactName  ?? null,
        p_emergency_contact_phone: emergencyContactPhone ?? null,
        p_allergies:               allergies        ?? [],
        p_chronic_conditions:      chronicConditions ?? [],
        p_current_medications:     currentMedications ?? [],
      }
    );

    if (profileErr) {
      console.error("[API] upsert_patient_profile error:", profileErr);
      return NextResponse.json(
        { error: profileErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error("[API] /api/onboarding/patient unhandled error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
