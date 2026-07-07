"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { sendOtp, verifyOtp } from "@/lib/otp-client";

type Role = "doctor" | "patient";

const PANEL_INFO = {
  doctor: {
    badge: "Pro",
    badgeClass: "bg-herb-green/20 text-herb-green",
    headline: "Your Practice,\nDigitised",
    sub: "Write SOAP notes, manage prescriptions, track vitals, and serve patients across all AYUSH systems — from one EMR.",
  },
  patient: {
    badge: "Patient",
    badgeClass: "bg-copper/20 text-copper",
    headline: "Holistic Care,\nAll in One",
    sub: "Book Ayurveda, Yoga, Homeopathy, Siddha and Naturopathy consultations. Track vitals, view prescriptions and manage your ABHA health locker.",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [role, setRole]             = useState<Role>("doctor");
  const [email, setEmail]           = useState("");
  const [otp, setOtp]               = useState("");
  const [otpMode, setOtpMode]       = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    practitioners: 89,
    patients: 1247,
    consultations: 340,
  });

  // Fetch dynamic stats from Supabase
  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      
      const [pracRes, patRes, apptRes] = await Promise.all([
        supabase.from("practitioners").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        practitioners: pracRes.count || 89,
        patients: patRes.count || 1247,
        consultations: apptRes.count || 340,
      });
    }
    fetchStats();
  }, []);

  // redirect if already logged in
  useEffect(() => {
    if (user) router.replace(user.role === "practitioner" ? "/pro" : "/discover");
  }, [user, router]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // First verify the user exists in our DB before sending OTP
      const supabase = createClient();
      const { data: dbUser, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", email)
        .single();

      if (userError || !dbUser) {
        setError("Account not found for this email.");
        setLoading(false);
        return;
      }

      const expectedRole = role === "doctor" ? "practitioner" : "patient";
      if (dbUser.role !== expectedRole) {
        setError("Invalid role selected for this account.");
        setLoading(false);
        return;
      }

      await sendOtp(email);
      setOtpMode(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOtp(email, otp);

      // OTP verified successfully. Now fetch user data and log them in.
      const supabase = createClient();
      const { data: dbUser, error: userError } = await supabase
        .from("users")
        .select("id, email, mobile, role")
        .eq("email", email)
        .single();

      if (userError || !dbUser) throw new Error("User data error after verification.");

      let name = "Unknown";
      if (dbUser.role === "practitioner") {
        const { data: prac } = await supabase.from("practitioners").select("full_name").eq("user_id", dbUser.id).maybeSingle();
        if (prac) name = prac.full_name;
      } else {
        const { data: pat } = await supabase.from("patients").select("full_name").eq("user_id", dbUser.id).maybeSingle();
        if (pat) name = pat.full_name;
      }

      login({
        id: dbUser.id,
        phone: dbUser.mobile,
        role: dbUser.role as any,
        name,
        abhaLinked: true,
        email: dbUser.email,
      });

      router.push(dbUser.role === "practitioner" ? "/pro" : "/discover");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  const panel = PANEL_INFO[role];

  const currentStats = role === "doctor" ? [
    { label: "AYUSH Practitioners", value: `${stats.practitioners}` },
    { label: "Consultations",       value: `${stats.consultations}` },
    { label: "Avg Rating",          value: "4.8 ★" },
    { label: "Patient Records",     value: `${stats.patients}` },
  ] : [
    { label: "Doctors on Platform",  value: `${stats.practitioners}` },
    { label: "AYUSH Disciplines",    value: "6" },
    { label: "Cities Covered",       value: "24" },
    { label: "Active Patients",      value: `${stats.patients}` },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-clinical-dark flex-col justify-between p-12 transition-all duration-300">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-herb-green flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">MeyVeda</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold transition-all", panel.badgeClass)}>
              {panel.badge}
            </span>
          </div>

          {/* Headline */}
          <div className="mt-16">
            <h1 className="text-white text-4xl font-display font-bold leading-tight whitespace-pre-line">
              {panel.headline}
            </h1>
            <p className="text-white/50 mt-4 text-sm leading-relaxed max-w-sm">
              {panel.sub}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 gap-4">
            {currentStats.map((s) => (
              <div key={s.label} className="bg-white/5 rounded-2xl p-4">
                <p className="text-white font-bold text-xl font-display">{s.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Divider + AYUSH badge row */}
          <div className="mt-10 flex items-center gap-3 flex-wrap">
            {["Ayurveda", "Yoga", "Unani", "Siddha", "Homeopathy", "Naturopathy"].map((s) => (
              <span key={s} className="text-[10px] font-medium text-white/30 border border-white/10 px-2.5 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">© 2026 MeyVeda · Trivine Tech Solutions</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-herb-green flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground">MeyVeda</span>
          </div>

          {/* Role toggle */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8">
            {(["doctor", "patient"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(""); setEmail(""); setOtp(""); setOtpMode(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
                  role === r ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r === "doctor" ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Doctor
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                    Patient
                  </>
                )}
              </button>
            ))}
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">
            {role === "doctor" ? "Doctor Sign In" : "Patient Sign In"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "doctor"
              ? "Access your EMR, patient queue, and prescriptions"
              : "Book consultations, view records and manage your health"}
          </p>

          <form onSubmit={otpMode ? handleVerifyOtp : handleSendOtp} className="mt-8 space-y-4">
            {!otpMode ? (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "doctor" ? "doctor@meyveda.in" : "patient@meyveda.in"}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20 focus:border-herb-green/50 bg-white placeholder:text-muted-foreground transition-all"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Enter 6-digit OTP</label>
                  <button type="button" onClick={() => setOtpMode(false)} className="text-[11px] text-herb-green hover:underline">Change email</button>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  maxLength={6}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20 focus:border-herb-green/50 bg-white placeholder:text-muted-foreground transition-all tracking-widest text-center"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-herb-green text-white font-semibold rounded-xl hover:bg-herb-green/90 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Processing…" : otpMode ? "Verify & Sign In" : "Send OTP"}
            </button>
          </form>

          {/* OR divider */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* OTP option */}
          <button className="mt-4 w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            Continue with OTP on Mobile
          </button>

          {/* Footer links */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New to MeyVeda?{" "}
            <a href="/onboarding" className="text-herb-green font-semibold hover:underline">
              Create account
            </a>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Admin?{" "}
            <a href="/admin" className="text-muted-foreground hover:text-foreground hover:underline">
              Admin sign in →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
