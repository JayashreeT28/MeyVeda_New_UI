"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { usePractitionerFollowUps } from "@/lib/hooks";
import { updateFollowUpDate } from "@/lib/queries";

type Filter = "today" | "week" | "overdue" | "completed";

const FILTER_LABELS: Record<Filter, string> = {
  today: "Due Today",
  week: "This Week",
  overdue: "Overdue",
  completed: "Completed",
};

const STATUS_STYLES: Record<Filter, string> = {
  today: "bg-herb-green/10 text-herb-green border-herb-green/20",
  week: "bg-blue-50 text-blue-700 border-blue-100",
  overdue: "bg-red-50 text-red-600 border-red-100",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function FollowUpsPage() {
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
      ? "Completed"
      : filter === "today"
      ? "Today"
      : filter === "overdue"
      ? `Overdue (${fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""})`
      : fu.recommendedDate ? new Date(fu.recommendedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return {
      id: fu.id,
      patient: fu.patientName,
      initials: fu.patientInitials,
      age: fu.patientAge,
      lastVisit: "Recent Consult",
      dueDate: dateLabel,
      dueDateRaw: fu.recommendedDate,
      reason: fu.isBooked ? "Scheduled consultation complete." : "Routine follow-up check-in.",
      filter,
      mode: "video" as const,
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-foreground">Follow-ups</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track pending follow-ups and schedule sessions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-herb-green border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(["today", "overdue", "week", "completed"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "bg-white rounded-xl border p-4 text-center transition-all",
                  activeFilter === f ? "border-herb-green/40 shadow-sm" : "border-border hover:border-herb-green/20"
                )}
              >
                <p
                  className={cn(
                    "font-display text-2xl font-bold",
                    f === "overdue" ? "text-red-500" :
                    f === "today" ? "text-herb-green" :
                    f === "week" ? "text-blue-600" : "text-muted-foreground"
                  )}
                >
                  {counts[f]}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{FILTER_LABELS[f]}</p>
              </button>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 w-fit">
            {(["today", "week", "overdue", "completed"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-4 py-2 text-xs font-medium rounded-lg transition-all",
                  activeFilter === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-12 text-center">
                <span className="text-4xl">✓</span>
                <p className="font-semibold text-foreground mt-3">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">No follow-ups in this category</p>
              </div>
            ) : (
              filtered.map((fu) => (
                <div
                  key={fu.id}
                  className={cn(
                    "bg-white rounded-2xl border overflow-hidden transition-all",
                    fu.filter === "overdue" ? "border-red-200" :
                    fu.filter === "today" ? "border-herb-green/30" : "border-border",
                    fu.filter === "completed" && "opacity-60"
                  )}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sage/20 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-sage">{fu.initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{fu.patient}</p>
                          <p className="text-xs text-muted-foreground">
                            {fu.age}y · {fu.lastVisit}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full border", STATUS_STYLES[fu.filter])}>
                        {fu.dueDate}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{fu.reason}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {fu.mode === "video" ? "📹 Video Consultation" : "🏥 In-Clinic"}
                    </p>

                    {fu.filter !== "completed" && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setSchedulingId(schedulingId === fu.id ? null : fu.id)}
                          className="flex-1 py-2 bg-herb-green text-white text-xs font-semibold rounded-xl hover:bg-herb-green/90 transition-all"
                        >
                          Change Follow-up Date
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline scheduler */}
                  {schedulingId === fu.id && (
                    <div className="border-t border-border bg-muted/30 p-5 space-y-3">
                      <p className="text-xs font-semibold text-foreground">Reschedule Follow-up — {fu.patient}</p>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-1.5">
                          New Recommended Date
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full text-sm border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:border-herb-green/50 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground block mb-1.5">
                          Follow-up Note (optional)
                        </label>
                        <textarea
                          rows={2}
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          placeholder="Reason for changing follow-up date…"
                          className="w-full text-sm border border-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-herb-green/50 bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSchedule(fu.id)}
                          disabled={!followUpDate}
                          className={cn(
                            "flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all",
                            followUpDate ? "bg-herb-green text-white hover:bg-herb-green/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                          )}
                        >
                          Confirm Date Update
                        </button>
                        <button
                          onClick={() => setSchedulingId(null)}
                          className="px-4 py-2.5 border border-border rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
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
  );
}
