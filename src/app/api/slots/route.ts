import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We use the service role key if available to bypass RLS for inserting slots.
// If it's not available, we fall back to the anon key, but RLS might block inserts.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const practitionerId = searchParams.get("practitioner_id");
  const date = searchParams.get("date");

  if (!practitionerId) {
    return NextResponse.json({ error: "Missing practitioner_id" }, { status: 400 });
  }

  let query = supabase
    .from("slots")
    .select("*")
    .eq("practitioner_id", practitionerId);

  if (date) {
    query = query.eq("slot_date", date);
  }

  query = query.order("start_time", { ascending: true });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slots: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slots } = body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'slots' array in request body" }, { status: 400 });
    }

    // Insert slots into the Supabase database
    const { data, error } = await supabase.from("slots").insert(slots).select();

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Slots inserted successfully", inserted: data });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to process request", details: err.message }, { status: 500 });
  }
}
