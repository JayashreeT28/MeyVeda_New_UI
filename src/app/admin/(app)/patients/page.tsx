"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAdminPatients } from "@/lib/hooks";
import { togglePatientStatus, createPatient } from "@/lib/queries";

type PatientStatus = "active" | "suspended";

type CareTeamMember = {
  doctorId: string;
  name: string;
  specialty: string;
  since: string;
};

const GENDERS = ["Male", "Female", "Other"];

const EMPTY_FORM = {
  name: "", phone: "", email: "", dob: "", gender: "Male",
  city: "", abha: false, abhaId: "",
};

export default function AdminPatientsPage() {
  const { data: patients, loading, refetch } = useAdminPatients();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | PatientStatus>("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-herb-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Pre-process and format patients
  const processedPatients = (patients ?? []).map((p: any) => {
    const userObj = Array.isArray(p.user) ? p.user[0] : p.user;
    const isActive = userObj?.is_active ?? true;
    const status: PatientStatus = isActive ? "active" : "suspended";
    
    const consultationsList = p.consultations ?? [];
    const uniqueDocsMap = new Map();
    consultationsList.forEach((c: any) => {
      if (c.practitioner) {
        uniqueDocsMap.set(c.practitioner.id, {
          doctorId: c.practitioner.id,
          name: c.practitioner.full_name,
          specialty: c.practitioner.disciplines?.[0] ?? "Ayurveda",
          since: c.session_start ? new Date(c.session_start).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—",
        });
      }
    });
    const careTeam: CareTeamMember[] = Array.from(uniqueDocsMap.values());

    const completedConsults = consultationsList.filter((c: any) => c.session_start);
    const lastVisit = completedConsults.length > 0 
      ? new Date(completedConsults.sort((a: any, b: any) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())[0].session_start).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })
      : "—";

    const genderLabel = p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other";
    const dobLabel = p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—";
    const registeredLabel = p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "—";
    const hasAbha = p.abha ? (Array.isArray(p.abha) ? p.abha.length > 0 : !!p.abha.abha_id) : false;
    const abhaIdLabel = p.abha ? (Array.isArray(p.abha) ? p.abha[0]?.abha_id : p.abha.abha_id) : "";

    return {
      ...p,
      genderLabel,
      dobLabel,
      registeredLabel,
      hasAbha,
      abhaIdLabel,
      status,
      userObj,
      careTeam,
      totalConsults: consultationsList.length,
      lastVisit,
    };
  });

  const filtered = processedPatients.filter((p) => {
    const matchSearch =
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.userObj?.mobile?.includes(search) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function toggleStatus(id: string, currentIsActive: boolean) {
    try {
      await togglePatientStatus(id, !currentIsActive);
      refetch();
      setSelected(null);
    } catch (err: any) {
      alert(err.message ?? "Failed to toggle status");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createPatient({
        name: form.name,
        phone: form.phone,
        email: form.email,
        dob: form.dob,
        gender: form.gender,
        city: form.city,
        abha: form.abha,
        abhaId: form.abhaId,
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      refetch();
    } catch (err: any) {
      alert(err.message ?? "Failed to create patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {processedPatients.length} registered · {processedPatients.filter((p) => p.hasAbha).length} ABHA linked
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-herb-green text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-herb-green/90 transition-all active:scale-95 flex-shrink-0"
        >
          + Add Patient
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, phone, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-3.5 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20 bg-white"
        />
        <div className="flex gap-1.5">
          {(["all", "active", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-2 text-xs font-semibold rounded-xl border transition-all capitalize",
                filterStatus === s
                  ? "bg-herb-green text-white border-herb-green"
                  : "border-border text-muted-foreground bg-white hover:border-herb-green/30"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ABHA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctors</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consults</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Visit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-background transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sage text-xs font-bold">{p.full_name ? p.full_name[0] : "P"}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{p.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.genderLabel} · DOB {p.dobLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-foreground">{p.userObj?.mobile || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{p.userObj?.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.hasAbha
                      ? <span className="text-[10px] font-semibold text-herb-green bg-herb-green/10 px-2 py-0.5 rounded-full">✓ Linked</span>
                      : <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Not linked</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-xs text-foreground">{p.city ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    {p.careTeam.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {p.careTeam.slice(0, 2).map((d: CareTeamMember) => (
                          <span key={d.doctorId} className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                            {d.name.replace("Dr. ", "")}
                          </span>
                        ))}
                        {p.careTeam.length > 2 && (
                          <span className="text-[10px] text-herb-green font-medium">+{p.careTeam.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-foreground font-semibold">{p.totalConsults}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{p.lastVisit}</td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize",
                      p.status === "active" ? "bg-herb-green/10 text-herb-green" : "bg-red-50 text-red-600"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setSelected(p)} className="text-[10px] font-semibold text-herb-green hover:underline">View</button>
                      <button
                        onClick={() => toggleStatus(p.id, p.userObj?.is_active ?? true)}
                        className={cn("text-[10px] font-semibold hover:underline", p.status === "active" ? "text-red-500" : "text-amber-600")}
                      >
                        {p.status === "active" ? "Suspend" : "Reinstate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-muted-foreground">No patients found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Patient Details</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-sage/20 flex items-center justify-center">
                  <span className="text-sage text-xl font-bold">{selected.full_name ? selected.full_name[0] : "P"}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selected.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.genderLabel} · {selected.city ?? "—"}</p>
                  {selected.hasAbha && <p className="text-xs text-herb-green mt-0.5">ABHA: {selected.abhaIdLabel}</p>}
                </div>
              </div>

              {/* Demographics */}
              <div className="mb-5">
                {[
                  ["Phone", selected.userObj?.mobile ?? "—"],
                  ["Email", selected.userObj?.email ?? "—"],
                  ["Date of Birth", selected.dobLabel],
                  ["Registered", selected.registeredLabel],
                  ["Last Visit", selected.lastVisit],
                  ["Total Consultations", String(selected.totalConsults)],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                ))}
              </div>

              {/* Care team */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Care Team · {selected.careTeam.length} {selected.careTeam.length === 1 ? "doctor" : "doctors"}
                </h4>
                {selected.careTeam.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No doctors assigned yet</p>
                ) : (
                  <div className="space-y-2">
                    {selected.careTeam.map((d: any) => (
                      <div key={d.doctorId} className="flex items-center gap-3 bg-background rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-lg bg-herb-green/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-herb-green text-[10px] font-bold">
                            {d.name.split(" ").slice(-1)[0]?.[0] ?? "D"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.specialty}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">since {d.since}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => toggleStatus(selected.id, selected.userObj?.is_active ?? true)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    selected.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-herb-green text-white hover:bg-herb-green/90"
                  )}
                >
                  {selected.status === "active" ? "Suspend Account" : "Reinstate Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add New Patient</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Full Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Patient full name"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Phone</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">City</label>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Date of Birth</label>
                  <input
                    required
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none bg-white"
                  >
                    {GENDERS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">ABHA Linked?</label>
                  <div className="flex gap-2 mt-1">
                    {([true, false] as const).map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, abha: v, abhaId: v ? f.abhaId : "" }))}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                          form.abha === v
                            ? "bg-herb-green text-white border-herb-green"
                            : "border-border text-muted-foreground hover:border-herb-green/30"
                        )}
                      >
                        {v ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>
                {form.abha && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1">ABHA ID</label>
                    <input
                      required
                      value={form.abhaId}
                      onChange={(e) => setForm((f) => ({ ...f, abhaId: e.target.value }))}
                      placeholder="patient@abdm"
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-herb-green/20"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-herb-green text-white rounded-xl text-sm font-semibold hover:bg-herb-green/90 transition-all disabled:opacity-60"
                >
                  {saving ? "Adding…" : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
