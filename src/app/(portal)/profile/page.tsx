"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ABHABadge } from "@/components/Badges";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import {
  usePatientProfile,
  useDinacharyaTasks,
  useHealthRecords,
  usePatientPrescriptions,
  usePractitionerAnalytics,
  usePractitionerPrescriptions,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { DinacharTask } from "@/lib/types";

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const PATIENT_MENU = [
  { icon: "👨‍👩‍👧‍👦", label: "Family Profiles", desc: "Manage linked members", href: "/profile/family" },
  { icon: "🛡️", label: "ABHA & ABDM", desc: "Government health ID settings", href: "/profile/abha" },
  { icon: "🔒", label: "Privacy & Consent", desc: "Control your health record access", href: "/profile/privacy" },
  { icon: "🔔", label: "Notification Preferences", desc: "Medication & appointment reminders", href: "/profile/notification-prefs" },
  { icon: "❓", label: "Help & Support", desc: "FAQs and live support", href: "/profile/help" },
  { icon: "📄", label: "Terms & Privacy Policy", desc: "Legal documentation", href: "/profile/terms" },
];

const PRACTITIONER_MENU = [
  { icon: "🪪", label: "HPR Registration", desc: "Health Professional Registry details", href: "#" },
  { icon: "📅", label: "Availability Settings", desc: "Manage your schedule and slots", href: "/pro/availability" },
  { icon: "🔒", label: "Privacy & Consent", desc: "Control your data sharing preferences", href: "/profile/privacy" },
  { icon: "🔔", label: "Notification Preferences", desc: "Appointment and follow-up alerts", href: "/profile/notification-prefs" },
  { icon: "❓", label: "Help & Support", desc: "FAQs and live support", href: "/profile/help" },
  { icon: "📄", label: "Terms & Privacy Policy", desc: "Legal documentation", href: "/profile/terms" },
];

/* Stats are now derived from context/DB — no hardcoded arrays */

export default function ProfilePage() {
  const { user, loading, updateUser, logout } = useAuth();
  const { data: profile } = usePatientProfile(user?.id);
  const { data: dbTasks } = useDinacharyaTasks(user?.id);

  // Patient details hooks
  const { data: patientRecords } = useHealthRecords(user?.role === "patient" ? user?.id : undefined);
  const { data: patientPrescriptions } = usePatientPrescriptions(user?.role === "patient" ? user?.id : undefined);

  // Practitioner details hooks
  const { data: pracAnalytics } = usePractitionerAnalytics(user?.role === "practitioner" ? user?.id : undefined);
  const { data: pracPrescriptions } = usePractitionerPrescriptions(user?.role === "practitioner" ? user?.id : undefined);

  const [tasks, setTasks] = useState<DinacharTask[]>([]);

  useEffect(() => {
    if (dbTasks && dbTasks.length > 0) setTasks(dbTasks);
  }, [dbTasks]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-herb-green"></div>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const wellnessScore = tasks.length > 0 ? progressPct : 74;

  // Prakriti Assessment Mapping
  let prakritiComposition = [
    { dosha: "Vata", pct: 33, color: "bg-sky-100 text-sky-700" },
    { dosha: "Pitta", pct: 33, color: "bg-amber-100 text-amber-700" },
    { dosha: "Kapha", pct: 34, color: "bg-emerald-100 text-emerald-700" },
  ];
  let dominantPrakriti = "Assessing";
  let prakritiAdvice = "Balance all three doshas with a varied, seasonal diet and moderate routines.";
  let hasPrakriti = false;

  if (profile?.prakriti) {
    hasPrakriti = true;
    const rawP = profile.prakriti.toLowerCase().replace(/_/g, "-");
    dominantPrakriti = profile.prakriti;
    if (rawP === "vata-pitta" || rawP === "vata_pitta") {
      prakritiComposition = [
        { dosha: "Vata", pct: 45, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 40, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 15, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Vata-Pitta. Focus on grounding routines and cooling foods.";
    } else if (rawP === "vata-kapha" || rawP === "vata_kapha") {
      prakritiComposition = [
        { dosha: "Vata", pct: 45, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 15, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 40, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Vata-Kapha. Focus on warm, light meals and dynamic exercises.";
    } else if (rawP === "pitta-kapha" || rawP === "pitta_kapha") {
      prakritiComposition = [
        { dosha: "Vata", pct: 15, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 45, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 40, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Pitta-Kapha. Focus on refreshing, light meals and calming habits.";
    } else if (rawP === "vata") {
      prakritiComposition = [
        { dosha: "Vata", pct: 70, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 15, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 15, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Vata. Focus on nourishing, warm foods and regular schedules.";
    } else if (rawP === "pitta") {
      prakritiComposition = [
        { dosha: "Vata", pct: 15, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 70, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 15, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Pitta. Focus on cooling foods, hydration, and mind relaxation.";
    } else if (rawP === "kapha") {
      prakritiComposition = [
        { dosha: "Vata", pct: 15, color: "bg-sky-100 text-sky-700" },
        { dosha: "Pitta", pct: 15, color: "bg-amber-100 text-amber-700" },
        { dosha: "Kapha", pct: 70, color: "bg-emerald-100 text-emerald-700" },
      ];
      prakritiAdvice = "Dominant: Kapha. Focus on warm, stimulating spices, and active workouts.";
    }
  }

  const isPractitioner = user?.role === "practitioner";
  const menuItems = isPractitioner ? PRACTITIONER_MENU : PATIENT_MENU;

  // Compute Days Active
  let daysActive = "—";
  if (user?.role === "patient" && patientRecords) {
    const dates = patientRecords.map((r) => new Date(r.date).getTime()).filter(Boolean);
    const earliestDate = dates.length > 0 ? Math.min(...dates) : new Date("2026-01-01").getTime();
    daysActive = String(Math.max(1, Math.floor((Date.now() - earliestDate) / 86400000)));
  }

  const stats = isPractitioner
    ? [
        { label: "Patients Seen", value: pracAnalytics ? String(pracAnalytics.totalConsultations) : "0" },
        { label: "Prescriptions", value: pracPrescriptions ? String(pracPrescriptions.length) : "0" },
        { label: "Rating", value: pracAnalytics?.avgRating ? `${pracAnalytics.avgRating.toFixed(1)} ★` : "—" },
      ]
    : [
        { label: "Consultations", value: patientRecords ? String(patientRecords.filter(r => r.type === "consultation").length) : "0" },
        { label: "Prescriptions", value: patientPrescriptions ? String(patientPrescriptions.length) : "0" },
        { label: "Days Active", value: daysActive },
      ];

  const [editMode, setEditMode] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    dob: user?.dob ?? "",
    gender: user?.gender ?? "",
    bloodGroup: user?.bloodGroup ?? "",
    ecName: user?.emergencyContact?.name ?? "",
    ecPhone: user?.emergencyContact?.phone ?? "",
    ecRelation: user?.emergencyContact?.relation ?? "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
        dob: user.dob ?? "",
        gender: user.gender ?? "",
        bloodGroup: user.bloodGroup ?? "",
        ecName: user.emergencyContact?.name ?? "",
        ecPhone: user.emergencyContact?.phone ?? "",
        ecRelation: user.emergencyContact?.relation ?? "",
      });
    }
  }, [user]);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  function handleSave() {
    updateUser({
      name: form.name.trim() || user?.name,
      email: form.email.trim() || undefined,
      dob: form.dob || undefined,
      gender: form.gender || undefined,
      bloodGroup: form.bloodGroup || undefined,
      emergencyContact:
        form.ecName && form.ecPhone
          ? { name: form.ecName, phone: form.ecPhone, relation: form.ecRelation }
          : undefined,
    });
    setEditMode(false);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="bg-herb-gradient rounded-2xl px-6 py-8 mb-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute -left-4 -bottom-8 w-28 h-28 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-bold font-display">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-semibold text-white">{user?.name ?? "Guest"}</h1>
            <p className="text-white/70 text-xs mt-0.5">+91 {user?.phone ?? "—"}</p>
            {user?.email && <p className="text-white/60 text-xs mt-0.5">{user.email}</p>}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {isPractitioner ? (
                <span className="text-[10px] bg-white/15 border border-white/20 text-white px-2 py-0.5 rounded-full">
                  HPR Registered ✓
                </span>
              ) : user?.abhaLinked ? (
                <ABHABadge
                  abhaId={`${user.phone?.slice(-4) ?? ""}@abha`}
                  linked
                  className="!bg-white/15 !border-white/20 !text-white text-[10px]"
                />
              ) : (
                <Link href="/profile/abha">
                  <span className="text-[10px] bg-white/15 border border-white/20 text-white px-2 py-0.5 rounded-full hover:bg-white/25 transition-colors cursor-pointer">
                    + Link ABHA ID
                  </span>
                </Link>
              )}
              {user?.bloodGroup && (
                <span className="text-[10px] bg-white/15 border border-white/20 text-white px-2 py-0.5 rounded-full">
                  {user.bloodGroup}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setEditMode((v) => !v); }}
            className="hidden sm:flex items-center gap-2 bg-white/15 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-medium hover:bg-white/25 transition-colors flex-shrink-0"
          >
            {editMode ? "✕ Cancel" : "✏️ Edit Profile"}
          </button>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center border border-white/10">
              <p className="font-display text-xl font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile edit toggle */}
      <button
        onClick={() => setEditMode((v) => !v)}
        className="sm:hidden w-full mb-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        {editMode ? "✕ Cancel Editing" : "✏️ Edit Profile"}
      </button>

      {/* Inline edit form */}
      {editMode && (
        <div className="bg-white rounded-2xl border border-herb-green/20 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-foreground text-sm mb-4">Personal Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="your@email.com"
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone</label>
              <input
                type="text"
                value={`+91 ${user?.phone ?? ""}`}
                disabled
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Phone cannot be changed</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 bg-white transition-all"
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Blood Group</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 bg-white transition-all"
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4 mb-4">
            <h3 className="font-semibold text-foreground text-xs mb-3 uppercase tracking-wider text-muted-foreground">Emergency Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.ecName}
                  onChange={(e) => setForm((p) => ({ ...p, ecName: e.target.value }))}
                  placeholder="Contact name"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.ecPhone}
                  onChange={(e) => setForm((p) => ({ ...p, ecPhone: e.target.value }))}
                  placeholder="10-digit number"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Relation</label>
                <input
                  type="text"
                  value={form.ecRelation}
                  onChange={(e) => setForm((p) => ({ ...p, ecRelation: e.target.value }))}
                  placeholder="e.g. Spouse"
                  className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-herb-green text-white text-sm font-semibold rounded-xl hover:bg-herb-green/90 transition-all active:scale-95"
            >
              Save Changes
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left: Menu */}
        <div className="space-y-4">
          {/* Personal info summary (when not editing) */}
          {!editMode && (user?.dob || user?.gender || user?.bloodGroup || user?.emergencyContact) && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Personal Details</h2>
                <button onClick={() => setEditMode(true)} className="text-xs text-herb-green font-medium hover:underline">Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                {user?.dob && (
                  <>
                    <span className="text-xs text-muted-foreground">Date of Birth</span>
                    <span className="text-xs font-medium text-foreground">{new Date(user.dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </>
                )}
                {user?.gender && (
                  <>
                    <span className="text-xs text-muted-foreground">Gender</span>
                    <span className="text-xs font-medium text-foreground">{user.gender}</span>
                  </>
                )}
                {user?.bloodGroup && (
                  <>
                    <span className="text-xs text-muted-foreground">Blood Group</span>
                    <span className="text-xs font-medium text-foreground">{user.bloodGroup}</span>
                  </>
                )}
                {user?.email && (
                  <>
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-xs font-medium text-foreground truncate">{user.email}</span>
                  </>
                )}
                {user?.emergencyContact && (
                  <>
                    <span className="text-xs text-muted-foreground">Emergency Contact</span>
                    <span className="text-xs font-medium text-foreground">
                      {user.emergencyContact.name} ({user.emergencyContact.relation}) · {user.emergencyContact.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {menuItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors">
                  <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-muted-foreground flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <button
            onClick={() => setShowSignOut(true)}
            className="w-full py-3.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            MeyVeda v1.0.0 · ABDM Compliant · Privacy First
          </p>
        </div>

        {/* Right: Wellness */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-foreground text-sm">Wellness Score</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Based on Dinacharya adherence</p>
              </div>
              <span className="font-display text-3xl font-bold text-herb-green">{wellnessScore}</span>
            </div>
            <Progress value={wellnessScore} className="h-2 bg-sand" />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>Needs improvement</span>
              <span>Excellent</span>
            </div>
          </div>

          <div className="bg-ivory-deep rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground text-sm">Your Prakriti</h2>
              <span className="text-xs text-herb-green font-medium">{hasPrakriti ? "Assessed" : "Not Assessed"}</span>
            </div>
            <div className="flex gap-2">
              {prakritiComposition.map((d) => (
                <div key={d.dosha} className={`flex-1 rounded-xl p-2.5 text-center ${d.color}`}>
                  <p className="font-bold text-sm font-display">{d.pct}%</p>
                  <p className="text-[10px] font-medium mt-0.5">{d.dosha}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2.5">
              {prakritiAdvice}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3">Linked Devices</h3>
            {["iPhone 15 Pro", "Apple Watch Series 9", "Omron BP Monitor"].map((d) => (
              <div key={d} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-xs text-foreground">{d}</p>
                <span className="text-[10px] text-herb-green">Synced ✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out confirmation dialog */}
      {showSignOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-red-500">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-foreground text-center">Sign out of MeyVeda?</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              You&apos;ll need your phone number to sign back in. Your health data is safely stored.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowSignOut(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Stay
              </button>
              <button
                onClick={logout}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
