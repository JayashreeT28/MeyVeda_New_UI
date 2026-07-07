import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

async function hashOTP(email: string, otp: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${email.toLowerCase()}:${otp}:${pepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const OTP_PEPPER = Deno.env.get("OTP_PEPPER")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@meyveda.com";

    // SMTP Credentials (ZeptoMail)
    const SMTP_HOST = "smtp.zeptomail.com";
    const SMTP_PORT = 587;
    const SMTP_USER = "emailapikey";
    const SMTP_PASS = "wSsVR60n/B+jB614lWasdr1pn1RXVQvxQB54ilLw7XP5HqqRosc4xhXKVwGlH6QdQmFtFDcWoLgpnE1U02Vbjtp+w1kIASiF9mqRe1U4J3x17qnvhDzMXG1dlxaAJYkLwg5tnGBoFsgr+g==";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('email_otps')
      .insert([
        {
          email: email.toLowerCase(),
          purpose: 'email_validation',
          otp: otp,
          expires_at: expiresAt,
        }
      ]);

    if (dbError) throw dbError;

    // Send email using ZeptoMail REST API (Required for Supabase Edge Functions)
    if (SMTP_PASS) {
      try {
        const zeptoRes = await fetch("https://api.zeptomail.com/v1.1/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Zoho-enczapikey ${SMTP_PASS}`,
          },
          body: JSON.stringify({
            from: { address: FROM_EMAIL },
            to: [{ email_address: { address: email } }],
            subject: "Your OTP verification code",
            textbody: `Your OTP is ${otp}. It will expire in 10 minutes.`,
          }),
        });

        if (!zeptoRes.ok) {
          const errTxt = await zeptoRes.text();
          console.error(`[ZeptoMail Error] Failed to send email: ${errTxt}`);
          throw new Error(`ZeptoMail API error: ${zeptoRes.status}`);
        } else {
          console.log(`Email sent successfully via ZeptoMail API to ${email}`);
        }
      } catch (apiError) {
        console.error("Failed to call ZeptoMail API:", apiError);
        throw apiError;
      }
    } else if (RESEND_API_KEY && RESEND_API_KEY !== "YOUR_RESEND_API_KEY") {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: "Your OTP verification code",
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
          }),
        });

        if (!resendRes.ok) {
          const errTxt = await resendRes.text();
          console.error(`[Resend Error] Failed to send email: ${errTxt}`);
        } else {
          console.log(`Email sent successfully via Resend to ${email}`);
        }
      } catch (sendError) {
        console.error("Failed to call Resend API:", sendError);
      }
    } else {
      console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
    }

    return new Response(JSON.stringify({ success: true, message: "OTP sent" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
