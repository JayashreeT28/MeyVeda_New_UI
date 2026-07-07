"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAdminDashboard } from "@/lib/hooks";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { data: dashboardStats } = useAdminDashboard();
  const stats = dashboardStats || {
    totalPractitioners: 0,
    totalClinics: 0,
    totalPatients: 0,
    totalMedicines: 0,
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mv_admin");
      if (stored) router.replace("/admin/dashboard");
    } catch {}
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message || "Invalid credentials.");
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (userError || (userData?.role !== "super_admin" && userData?.role !== "clinic_admin")) {
      setError("Unauthorised. Admin access required.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    localStorage.setItem("mv_admin", JSON.stringify({
      name: "MeyVeda Admin",
      email,
      role: userData.role,
      loginAt: new Date().toISOString(),
    }));
    
    router.push("/admin/dashboard");
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-clinical-dark flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-herb-green flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">MeyVeda</span>
            <span className="text-xs bg-herb-green/20 text-herb-green px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
          <div className="mt-16">
            <h1 className="text-white text-4xl font-display font-bold leading-tight">
              Platform<br />Control Centre
            </h1>
            <p className="text-white/50 mt-4 text-sm leading-relaxed max-w-sm">
              Manage practitioners, hospitals, patients, medicines, and the entire MeyVeda ecosystem from one place.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Practitioners", value: stats.totalPractitioners },
              { label: "Hospitals", value: stats.totalClinics },
              { label: "Patients", value: stats.totalPatients },
              { label: "Medicines", value: stats.totalMedicines },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-2xl p-4">
                <p className="text-white font-bold text-xl font-display">{s.value}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs">© 2026 MeyVeda · Trivine Tech Solutions</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-herb-green flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground">MeyVeda Admin</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-foreground">Admin Sign In</h2>
          <p className="text-sm text-muted-foreground mt-1">Restricted access — authorised personnel only</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@meyveda.com"
                required
                className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20 focus:border-herb-green/50 bg-white placeholder:text-muted-foreground transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20 focus:border-herb-green/50 bg-white placeholder:text-muted-foreground transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

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
              {loading ? "Signing in…" : "Sign In to Admin Panel"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
