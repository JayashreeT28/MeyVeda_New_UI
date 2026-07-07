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
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Call Supabase Edge function verify-otp
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
      "verify-otp",
      {
        body: { email, otp },
      }
    );

    if (verifyError) {
      let errMsg = verifyError.message;
      if ((verifyError as any).context) {
        try {
          const errData = await (verifyError as any).context.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch {}
      }
      return NextResponse.json(
        { error: errMsg || "Invalid OTP" },
        { status: 400 }
      );
    }

    if (verifyData && verifyData.error) {
      return NextResponse.json({ error: verifyData.error }, { status: 400 });
    }

    // Get user details from database
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, email, mobile, role")
      .eq("email", email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json(
        { error: "User profile not found in database." },
        { status: 404 }
      );
    }

    let name = "Unknown";
    if (dbUser.role === "practitioner") {
      const { data: prac } = await supabase
        .from("practitioners")
        .select("full_name")
        .eq("user_id", dbUser.id)
        .maybeSingle();
      if (prac) name = prac.full_name;
    } else if (dbUser.role === "patient") {
      const { data: pat } = await supabase
        .from("patients")
        .select("full_name")
        .eq("user_id", dbUser.id)
        .maybeSingle();
      if (pat) name = pat.full_name;
    }

    // Sign JWT
    const token = await signToken({
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.mobile,
      role: dbUser.role,
      name,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: dbUser.id,
        phone: dbUser.mobile,
        role: dbUser.role,
        name,
        abhaLinked: true,
        email: dbUser.email,
      },
    });
  } catch (err: any) {
    console.error("Login API route error:", err);
    return NextResponse.json(
      { error: err.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
