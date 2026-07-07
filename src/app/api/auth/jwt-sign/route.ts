import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signToken } from "@/lib/jwt";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { userId, email, role, phone, name } = await request.json();

    if (!userId || !email || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user exists in the database
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .eq("email", email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json(
        { error: "Unauthorized: User not found" },
        { status: 401 }
      );
    }

    // Sign token
    const token = await signToken({
      id: userId,
      email,
      phone: phone || "",
      role,
      name: name || "Unknown",
    });

    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error("JWT sign API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}
