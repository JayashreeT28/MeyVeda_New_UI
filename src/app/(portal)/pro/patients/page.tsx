"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { getRegistryPatients } from "@/lib/queries";
import { 
  UserPlus, Search, X, Users, Calendar, 
  Edit3, AlertCircle
} from "lucide-react";

type Filter = "all" | "today" | "followup" | "recent";

type Problem = { code: string; name: string; status: "active" | "controlled" | "resolved" };

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  abha: string | null;
  bloodGroup: string;
  prakriti: string;
  lastVisit: string;        // display string
  lastVisitDaysAgo: number; // for filter logic
  nextFollowUp: string | null;
  followUpDue: boolean;
  isToday: boolean;
  conditions: string;
  systems: string[];        // AYUSH systems under care
  totalVisits: number;
  problems: Problem[];
  allergySummary: string;
  activeMeds: number;
  vitals: { bpSys: number; bpDia: number; pulse: number; spo2: number; weight: number } | null;
};

function vStat(key: string, n: number): "normal" | "warning" | "alert" {
  if (key === "bpSys")  return n < 90 ? "alert"  : n <= 120 ? "normal" : n <= 139 ? "warning" : "alert";
  if (key === "bpDia")  return n < 60 ? "warning" : n <= 80  ? "normal" : n <= 89  ? "warning" : "alert";
  if (key === "pulse")  return n < 60 || n > 100  ? "warning" : "normal";
  if (key === "spo2")   return n < 90 ? "alert"   : n < 95   ? "warning" : "normal";
  return "normal";
}

const statStyle = {
  normal:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  alert:   "bg-red-50 text-red-700 border-red-200",
};

export default function PatientsPage() {
  const { user } = useAuth();
  const [query, setQuery]           = useState("");
  const [filter, setFilter]         = useState<Filter>("all");
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  async function fetchPatients() {
    setIsLoading(true);
    try {
      const data = await getRegistryPatients(user?.id);
      setPatients(data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchPatients();
    }
  }, [user?.id]);

  const filtered = useMemo(() => {
    let list = patients;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.abha?.toLowerCase().includes(q) ?? false) ||
        p.conditions.toLowerCase().includes(q) ||
        p.problems.some(pr => pr.name.toLowerCase().includes(q))
      );
    }
    if (filter === "today")   list = list.filter(p => p.isToday);
    if (filter === "followup") list = list.filter(p => p.followUpDue);
    if (filter === "recent")  list = list.filter(p => p.lastVisitDaysAgo <= 30);
    return list;
  }, [patients, query, filter]);

  const FILTER_TABS: { id: Filter; label: string; count: () => number }[] = [
    { id: "all",      label: "All Patients",  count: () => patients.length },
    { id: "today",    label: "Today's Queue", count: () => patients.filter(p => p.isToday).length },
    { id: "followup", label: "Follow-up Due", count: () => patients.filter(p => p.followUpDue).length },
    { id: "recent",   label: "Last 30 Days",  count: () => patients.filter(p => p.lastVisitDaysAgo <= 30).length },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="px-6 lg:px-8 py-8 max-w-[1200px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Registry</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              Search, view, and update any patient record — independent of appointments
            </p>
          </div>
          <Link href="/pro/walk-in">
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-[0_4px_12px_rgb(79,70,229,0.25)] hover:-translate-y-0.5 transition-all">
              <UserPlus className="w-4 h-4" />
              Walk-in Patient
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 mb-8">
          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, phone, ABHA ID, diagnosis, or condition…"
              className="w-full pl-12 pr-12 py-3.5 text-sm border border-gray-200 rounded-xl bg-[#F8FAFC] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400 transition-all font-medium"
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 bg-white rounded-md shadow-sm border border-gray-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)}
                className={cn("px-4 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
                  filter === t.id 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                )}>
                {t.label}
                <span className={cn("text-[11px] px-2 py-0.5 rounded-md font-bold",
                  filter === t.id ? "bg-white/20 text-white" : "bg-white text-gray-500 border border-gray-200 shadow-sm"
                )}>{t.count()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4 px-2">
          <p className="text-sm font-bold text-gray-500">
            {filtered.length === 0 ? "No patients found" : `${filtered.length} patient${filtered.length !== 1 ? "s" : ""}`}
            {query && <span className="font-medium"> matching "{query}"</span>}
          </p>
          {filter === "followup" && filtered.length > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {filtered.length} follow-up{filtered.length !== 1 ? "s" : ""} overdue
            </span>
          )}
        </div>

        {/* Patient list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[16px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">No patients found</p>
            <p className="text-sm font-medium text-gray-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => (
              <div key={p.id}
                className="bg-white rounded-[24px] border border-gray-200 hover:border-gray-300 hover:shadow-md shadow-sm transition-all duration-250 flex flex-col p-6 group cursor-pointer"
              >
                {/* Header: Avatar, Name, Badges */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-100">
                      <span className="font-bold text-indigo-600 text-xl">{p.name[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                      <p className="text-sm text-gray-500 font-medium mb-2">{p.phone}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{p.age}y</span>
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{p.gender}</span>
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{p.bloodGroup}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex flex-col gap-1 items-end">
                    {p.isToday && (
                      <span className="bg-emerald-50 text-emerald-700 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-emerald-100">Today</span>
                    )}
                    {p.followUpDue && (
                      <span className="bg-amber-50 text-amber-700 font-semibold text-[10px] px-2.5 py-1 rounded-full border border-amber-100">Follow-up Due</span>
                    )}
                  </div>
                </div>

                {/* Info Container */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 grid grid-cols-2 gap-y-4 gap-x-3 border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Last Visit</span>
                    <span className="text-gray-900 text-sm font-medium">{p.lastVisit || 'No visits'}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Visits</span>
                     <span className="text-gray-900 text-sm font-medium">{p.totalVisits} visit{p.totalVisits !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Medicines</span>
                     <span className="text-gray-900 text-sm font-medium">{p.activeMeds} meds</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Next Appt</span>
                     <span className="text-gray-900 text-sm font-medium">{p.nextFollowUp || 'None'}</span>
                  </div>
                  <div className="col-span-2 pt-3 mt-1 border-t border-gray-200 flex flex-col">
                     <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Prakriti</span>
                     <span className="text-gray-900 text-sm font-medium italic">{p.prakriti || 'Unknown'} Prakriti</span>
                  </div>
                </div>

                {/* Vitals summary badges */}
                {p.vitals && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {[
                      { k: "bpSys",  label: `${p.vitals.bpSys}/${p.vitals.bpDia}`, unit: "", },
                      { k: "pulse",  label: `${p.vitals.pulse}`,  unit: "bpm" },
                      { k: "spo2",   label: `${p.vitals.spo2}`,   unit: "%" },
                    ].map(v => (
                      <span key={v.k} className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md border",
                        statStyle[vStat(v.k, v.k === "bpSys" ? p.vitals!.bpSys : v.k === "pulse" ? p.vitals!.pulse : p.vitals!.spo2)]
                      )}>
                        {v.label}{v.unit}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-auto pt-2">
                  <Link href={`/pro/patient/${p.id}`} className="block">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-bold transition-all duration-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 hover:shadow-sm group-hover:-translate-y-0.5 active:scale-[0.98]">
                      <Edit3 className="w-4 h-4" />
                      Update Record
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
