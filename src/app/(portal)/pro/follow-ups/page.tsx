"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePractitionerFollowUps } from "@/lib/hooks";
import { updateFollowUpDate } from "@/lib/queries";
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  FileText, 
  CalendarPlus, 
  ChevronRight,
  Stethoscope,
  X,
  Search
} from "lucide-react";

type Filter = "today" | "week" | "overdue" | "completed";

// Strictly matching the requested Medical Palette
// Primary: #2563EB
// Background: #F8FAFC
// Cards: #FFFFFF
// Border: #E5E7EB
// Primary Text: #111827
// Secondary Text: #6B7280
// Success: #16A34A
// Warning: #F59E0B
// Danger: #DC2626

const FILTER_CONFIG: Record<Filter, { label: string; icon: React.ElementType; color: string; bg: string; badge: string; text: string; subtext: string }> = {
  today: { label: "Today", icon: Clock, color: "text-[#16A34A]", bg: "bg-[#16A34A]/10", badge: "bg-[#16A34A]/10 text-[#16A34A]", text: "Today's Follow-ups", subtext: "Due for check-in today" },
  week: { label: "Upcoming", icon: Calendar, color: "text-[#2563EB]", bg: "bg-[#2563EB]/10", badge: "bg-[#2563EB]/10 text-[#2563EB]", text: "Upcoming", subtext: "Scheduled this week" },
  overdue: { label: "Overdue", icon: AlertCircle, color: "text-[#DC2626]", bg: "bg-[#DC2626]/10", badge: "bg-[#DC2626]/10 text-[#DC2626]", text: "Overdue", subtext: "Requires immediate attention" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-[#6B7280]", bg: "bg-[#F3F4F6]", badge: "bg-[#F3F4F6] text-[#6B7280]", text: "Completed", subtext: "Successfully reviewed" },
};

export default function FollowUpsDashboard() {
  const { user } = useAuth();
  const { data: followUps = [], loading, refetch } = usePractitionerFollowUps(user?.id);

  const [activeFilter, setActiveFilter] = useState<Filter>("today");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  function getFollowUpFilter(recommendedDateStr: string, isBooked: boolean): Filter {
    if (isBooked) return "completed";
    if (!recommendedDateStr) return "today";
    
    const recDate = new Date(recommendedDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    recDate.setHours(0,0,0,0);

    const diffTime = recDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays < 0) return "overdue";
    return "week"; // positive, non-today is classified as week/upcoming
  }

  const formattedFollowUps = (followUps || []).map((fu) => {
    const filter = getFollowUpFilter(fu.recommendedDate, fu.isBooked);
    const dateLabel = fu.isBooked
      ? `Booked (${fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : ""})`
      : filter === "today"
      ? "Today"
      : filter === "overdue"
      ? `Overdue (${fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : ""})`
      : fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return {
      id: fu.id,
      patient: fu.patientName || "Unknown Patient",
      initials: fu.patientInitials || "?",
      age: fu.patientAge || "--",
      gender: "Not specified", // Placeholder as it's requested but not in standard payload yet
      patientId: fu.patientId || "ID-UNKNOWN",
      lastVisit: "Recent Consult",
      dueDate: dateLabel,
      dueDateRaw: fu.recommendedDate,
      reason: fu.isBooked ? "Upcoming session booked." : "Routine follow-up review.",
      filter,
      mode: "video" as const,
      assignedDoctor: "Primary Physician",
    };
  });

  const filtered = formattedFollowUps.filter((f) => f.filter === activeFilter);

  const counts: Record<Filter, number> = {
    today: formattedFollowUps.filter((f) => f.filter === "today").length,
    week: formattedFollowUps.filter((f) => f.filter === "week").length,
    overdue: formattedFollowUps.filter((f) => f.filter === "overdue").length,
    completed: formattedFollowUps.filter((f) => f.filter === "completed").length,
  };

  async function handleSchedule(id: string) {
    if (!followUpDate) return;
    try {
      await updateFollowUpDate(id, followUpDate);
      setSchedulingId(null);
      setFollowUpDate("");
      setFollowUpNote("");
      refetch();
    } catch (err) {
      console.error("Failed to update follow-up recommended date:", err);
    }
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">
      <div className="max-w-[1200px] mx-auto px-6 pt-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[32px] font-bold text-[#111827] leading-tight">
              Follow-up Dashboard
            </h1>
            <p className="text-[15px] text-[#6B7280] mt-1.5 max-w-2xl">
              Manage scheduled patient follow-ups, upcoming reviews, overdue appointments, and completed check-ins.
            </p>
          </div>
          <div>
            <button className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-[12px] font-medium text-[15px] transition-colors shadow-sm">
              <CalendarPlus className="w-5 h-5" />
              Schedule Follow-up
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-4 border-[#E5E7EB] border-t-[#2563EB] animate-spin" />
          </div>
        ) : (
          <>
            {/* Statistics Cards (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {(Object.keys(FILTER_CONFIG) as Filter[]).map((f) => {
                const conf = FILTER_CONFIG[f];
                const Icon = conf.icon;
                return (
                  <div
                    key={f}
                    className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[16px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", conf.bg)}>
                        <Icon className={cn("w-5 h-5", conf.color)} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[32px] font-bold text-[#111827] leading-none mb-1">{counts[f]}</span>
                      <span className="text-[15px] font-semibold text-[#111827]">{conf.text}</span>
                      <span className="text-[13px] text-[#6B7280] mt-0.5">{conf.subtext}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter Tabs (Segmented Control) */}
            <div className="flex items-center bg-[#F3F4F6] p-1 rounded-[12px] w-fit mb-8 shadow-inner border border-[#E5E7EB]/50">
              {(Object.keys(FILTER_CONFIG) as Filter[]).map((f) => {
                const isActive = activeFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      "px-5 py-2 text-[14px] font-medium rounded-[10px] transition-all duration-200",
                      isActive 
                        ? "bg-[#FFFFFF] text-[#2563EB] shadow-[0_1px_3px_rgba(0,0,0,0.1)]" 
                        : "text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/50"
                    )}
                  >
                    {FILTER_CONFIG[f].label}
                  </button>
                );
              })}
            </div>

            {/* Follow-up List */}
            <div className="space-y-4">
              {filtered.length === 0 ? (
                /* Empty State */
                <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[16px] p-16 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-5">
                    <Search className="w-8 h-8 text-[#6B7280]" />
                  </div>
                  <h3 className="text-[22px] font-bold text-[#111827] mb-2">No follow-ups scheduled</h3>
                  <p className="text-[15px] text-[#6B7280] mb-6 max-w-sm">
                    Newly scheduled follow-ups will appear here based on your selected filters.
                  </p>
                  <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2 rounded-[12px] font-medium text-[14px] transition-colors">
                    Schedule Follow-up
                  </button>
                </div>
              ) : (
                filtered.map((fu) => (
                  <div
                    key={fu.id}
                    className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-[1px] transition-all duration-200"
                  >
                    <div className="p-6 flex flex-col lg:flex-row gap-6 lg:items-center">
                      
                      {/* Left Section: Patient Info */}
                      <div className="flex items-center gap-4 lg:w-[30%]">
                        <div className="w-[48px] h-[48px] rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0">
                          <span className="font-semibold text-[#111827] text-[16px]">{fu.initials}</span>
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-[16px] font-semibold text-[#111827]">{fu.patient}</h4>
                          <div className="flex items-center text-[13px] text-[#6B7280] mt-0.5 gap-2">
                            <span>{fu.age} yrs</span>
                            <span>•</span>
                            <span>{fu.gender}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E5E7EB]">{fu.patientId.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Divider (Desktop) */}
                      <div className="hidden lg:block w-px h-12 bg-[#E5E7EB]" />

                      {/* Middle Section: Details */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                        <div>
                          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mb-1">
                            <Calendar className="w-3.5 h-3.5" /> Date & Type
                          </div>
                          <div className="text-[15px] font-medium text-[#111827]">
                            {fu.dueDateRaw ? new Date(fu.dueDateRaw).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "Unscheduled"}
                            <span className="text-[#6B7280] font-normal ml-2">({fu.mode})</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mb-1">
                            <FileText className="w-3.5 h-3.5" /> Reason
                          </div>
                          <div className="text-[15px] font-medium text-[#111827] truncate">
                            {fu.reason}
                          </div>
                        </div>
                      </div>

                      {/* Divider (Desktop) */}
                      <div className="hidden lg:block w-px h-12 bg-[#E5E7EB]" />

                      {/* Right Section: Status & Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 lg:w-[20%]">
                        <div className={cn("px-3 py-1 rounded-full text-[13px] font-medium", FILTER_CONFIG[fu.filter].badge)}>
                          {FILTER_CONFIG[fu.filter].label}
                        </div>
                        
                        {fu.filter !== "completed" ? (
                          <div className="flex items-center gap-2">
                            <Link href={`/pro/patient/${fu.patientId}`}>
                              <button className="text-[14px] font-medium text-[#6B7280] hover:text-[#111827] px-3 py-1.5 transition-colors">
                                View Details
                              </button>
                            </Link>
                            <button
                              onClick={() => setSchedulingId(schedulingId === fu.id ? null : fu.id)}
                              className="text-[14px] font-medium bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] px-4 py-1.5 rounded-[8px] transition-colors"
                            >
                              Reschedule
                            </button>
                          </div>
                        ) : (
                          <Link href={`/pro/patient/${fu.patientId}`}>
                            <button className="text-[14px] font-medium text-[#2563EB] hover:text-[#1D4ED8] px-3 py-1.5 transition-colors">
                              View Details
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Inline Reschedule Form */}
                    {schedulingId === fu.id && (
                      <div className="border-t border-[#E5E7EB] bg-[#F8FAFC] p-6 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-[1]">
                            <label className="text-[14px] font-medium text-[#111827] block mb-1.5">
                              New Date
                            </label>
                            <input
                              type="date"
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full text-[15px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-[#FFFFFF] transition-all"
                            />
                          </div>
                          <div className="flex-[2]">
                            <label className="text-[14px] font-medium text-[#111827] block mb-1.5">
                              Follow-up Note <span className="text-[#6B7280] font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={followUpNote}
                              onChange={(e) => setFollowUpNote(e.target.value)}
                              placeholder="e.g. Needs updated vitals"
                              className="w-full text-[15px] border border-[#E5E7EB] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-[#FFFFFF] transition-all"
                            />
                          </div>
                          <div className="flex items-end gap-2 mt-2 md:mt-0">
                            <button
                              onClick={() => setSchedulingId(null)}
                              className="px-4 py-2 text-[14px] font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB]/50 rounded-[10px] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSchedule(fu.id)}
                              disabled={!followUpDate}
                              className={cn(
                                "px-5 py-2 text-[14px] font-medium rounded-[10px] transition-colors",
                                followUpDate 
                                  ? "bg-[#2563EB] hover:bg-[#1D4ED8] text-white" 
                                  : "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                              )}
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
