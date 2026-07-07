"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { ABHABadge } from "@/components/Badges";
import { PractitionerCard } from "@/components/PractitionerCard";
import { usePractitioners, useDinacharyaTasks, useAppointments, usePatientProfile } from "@/lib/hooks";
import { toggleDinacharyaTask } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import type { DinacharTask } from "@/lib/types";

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Fetch from Supabase
  const { data: practitioners } = usePractitioners();
  const { data: dbTasks } = useDinacharyaTasks(user?.id);
  const { data: appointments } = useAppointments(user?.id);
  const { data: profile } = usePatientProfile(user?.id);

  const [tasks, setTasks] = useState<DinacharTask[]>([]);

  useEffect(() => {
    if (dbTasks && dbTasks.length > 0) setTasks(dbTasks);
  }, [dbTasks]);

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const wellnessScore = tasks.length > 0 ? progressPct : 0;

  const upcoming = (appointments ?? []).find((a) => a.status === "upcoming");

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

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => {
      if (t.id === id) {
        const newDone = !t.done;
        toggleDinacharyaTask(id, newDone);
        return { ...t, done: newDone };
      }
      return t;
    }));
  }

  const categoryIcon: Record<DinacharTask["category"], string> = {
    diet: "🥗",
    exercise: "🧘",
    mindfulness: "🌬️",
    medicine: "🌿",
  };

  const aiQuestions = profile?.prakriti?.toLowerCase().includes('vata') 
    ? ["Balance Vata dosha", "Gut health tips", "Sleep routine", "Immunity boost"]
    : profile?.prakriti?.toLowerCase().includes('pitta')
    ? ["Balance Pitta dosha", "Cooling diet tips", "Sleep routine", "Immunity boost"]
    : profile?.prakriti?.toLowerCase().includes('kapha')
    ? ["Balance Kapha dosha", "Active workouts", "Gut health tips", "Immunity boost"]
    : ["Gut health tips", "Daily routine", "Sleep routine", "Immunity boost"];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            Good morning, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Here&apos;s your wellness overview and AYUSH companion updates.</p>
          {profile?.abhaId && (
            <div className="mt-2.5">
              <ABHABadge abhaId={profile.abhaId} linked />
            </div>
          )}
        </div>
        {upcoming && (
          <Link href={`/consult?id=${upcoming.consultationId || upcoming.id}`}>
            <div className="flex items-center gap-2 bg-gradient-to-r from-herb-green to-herb-green-light text-white px-5 py-3 rounded-2xl text-sm font-semibold hover:shadow-lg hover:opacity-95 transition-all cursor-pointer shadow-sm active:scale-98">
              <span>📹</span>
              <span>Join Today&apos;s Consult</span>
            </div>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Left column */}
        <div className="space-y-8">
          {/* Upcoming consult banner */}
          {upcoming ? (
            <div className="bg-gradient-to-br from-herb-green via-herb-green-light to-herb-green/95 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-lg border border-herb-green/20">
              <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <div className="absolute -right-2 -bottom-6 w-36 h-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
              
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-white/80 bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10">
                    Upcoming Consult
                  </span>
                  <h3 className="font-display text-xl font-bold mt-3">{upcoming.doctor}</h3>
                  <p className="text-sm text-white/85 mt-1 font-medium">{upcoming.specialty} · {upcoming.date}</p>
                  
                  <div className="mt-6 flex items-center gap-2.5 flex-wrap">
                    <Link href={`/consult?id=${upcoming.consultationId || upcoming.id}`}>
                      <button className="px-4.5 py-2 bg-white text-herb-green text-xs font-bold rounded-xl hover:bg-white/95 transition-all shadow-sm active:scale-98">
                        Join Room
                      </button>
                    </Link>
                    <Link href={`/waiting-room?id=${upcoming.id}`}>
                      <button className="px-4.5 py-2 bg-white/15 text-white text-xs font-semibold rounded-xl hover:bg-white/25 border border-white/10 transition-all active:scale-98">
                        Waiting Room
                      </button>
                    </Link>
                    <Link href="/appointments">
                      <button className="px-4.5 py-2 bg-white/10 text-white/90 text-xs font-medium rounded-xl hover:bg-white/20 transition-all active:scale-98">
                        Reschedule
                      </button>
                    </Link>
                  </div>
                </div>
                
                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="text-white font-extrabold font-display text-xl tracking-wider">{upcoming.initials}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-herb-green via-[#228B22] to-herb-green/90 rounded-[2rem] p-7 text-white relative overflow-hidden shadow-lg border border-herb-green/20">
              <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <div className="absolute -right-2 -bottom-6 w-36 h-36 rounded-full bg-white/5 blur-lg pointer-events-none" />
              
              <div className="relative z-10 max-w-2xl">
                <span className="text-[10px] font-bold text-white/80 bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/10">
                  Consultation
                </span>
                <h3 className="font-display text-xl font-bold mt-3">Book your first AYUSH consultation</h3>
                <p className="text-sm text-white/85 mt-1.5 leading-relaxed font-medium">
                  Get personalized, holistic treatment and digital prescriptions from verified Ayurveda, Homeopathy, and Yoga experts.
                </p>
                <div className="mt-6">
                  <Link href="/discover">
                    <button className="px-5 py-2.5 bg-white text-herb-green text-xs font-bold rounded-xl hover:bg-white/95 transition-all shadow-md active:scale-98">
                      Find Practitioner
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { href: "/discover", icon: "🩺", label: "Book Consult", sub: "6 AYUSH specialties", color: "bg-emerald-500/10 text-emerald-700" },
              { href: "/ai-chat", icon: "✨", label: "AyurSanvaad AI", sub: "AI Companion", color: "bg-indigo-500/10 text-indigo-700" },
              { href: "/apothecary", icon: "🏥", label: "Apothecary", sub: "Your medicines", color: "bg-amber-500/10 text-amber-700" },
              { href: "/records", icon: "📁", label: "Health Records", sub: "Timeline & ABHA", color: "bg-sky-500/10 text-sky-700" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="group block">
                <div className="bg-white rounded-3xl p-5 border border-border/80 hover:border-herb-green/30 hover:shadow-[0_12px_24px_-8px_rgba(27,107,74,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center relative overflow-hidden h-full">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-xl mx-auto mb-3.5 transition-transform duration-300 group-hover:scale-110", item.color)}>
                    {item.icon}
                  </div>
                  <p className="text-xs font-bold text-foreground group-hover:text-herb-green transition-colors">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Dinacharya Tracker */}
          <section className="bg-white rounded-[2rem] border border-border/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-foreground text-base">
                Today&apos;s Dinacharya
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-herb-green font-mono">{progressPct}%</span>
                <Link href="/dinacharya" className="text-xs text-herb-green font-semibold hover:underline">Full view →</Link>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {completedCount} of {tasks.length} completed today
            </p>
            <Progress value={progressPct} className="h-2 mb-5 bg-sand rounded-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {tasks.length === 0 ? (
                <div className="text-center py-6 col-span-2 bg-neutral-50 rounded-2xl border border-dashed border-border">
                  <p className="text-xs text-muted-foreground">No habits configured for today.</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 text-left active:scale-[0.99] group/task",
                      task.done
                        ? "bg-herb-green/5 border-herb-green/20"
                        : "bg-background border-border/80 hover:border-herb-green/30 hover:shadow-sm"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        task.done ? "border-herb-green bg-herb-green shadow-sm" : "border-muted-foreground/45 group-hover/task:border-herb-green/70"
                      )}
                    >
                      {task.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm p-0.5 bg-neutral-100/80 rounded group-hover/task:scale-105 transition-transform">{categoryIcon[task.category]}</span>
                        <span
                          className={cn(
                            "text-sm font-bold truncate",
                            task.done ? "line-through text-muted-foreground/80 font-medium" : "text-foreground"
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-medium">
                        {task.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{task.time}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* AI Card */}
          <Link href="/ai-chat" className="block group">
            <div className="bg-white rounded-[2rem] p-6 border border-border/85 hover:border-herb-green/30 hover:shadow-[0_8px_24px_-4px_rgba(27,107,74,0.08)] transition-all duration-300 relative overflow-hidden bg-gradient-to-br from-white to-neutral-50/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-herb-green/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-herb-green/10 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <span className="text-xl">✨</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-herb-green transition-colors">AyurSanvaad AI</h3>
                    <span className="text-[9px] bg-herb-green/10 text-herb-green font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-herb-green/15">
                      AI Companion
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
                    How can I help you balance your wellness routine today? Ask about herbs, remedies, or Prakriti.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {aiQuestions.map(
                      (q) => (
                        <span
                          key={q}
                          className="text-[10px] font-semibold border border-border rounded-full px-3 py-1 bg-white text-muted-foreground hover:border-herb-green/40 hover:text-herb-green cursor-pointer transition-colors shadow-sm"
                        >
                          {q}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Wellness score */}
          <div className="bg-white rounded-[2rem] border border-border/80 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-foreground text-sm">Wellness Score</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Based on Dinacharya progress</p>
              </div>
              <span className="font-display text-4xl font-extrabold text-herb-green font-mono">{wellnessScore}</span>
            </div>
            <Progress value={wellnessScore} className="h-2 bg-sand rounded-full" />
            <div className="flex justify-between mt-2.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Needs improvement</span>
              <span>Excellent</span>
            </div>
          </div>

          {/* Prakriti assessment */}
          <div className="bg-white rounded-[2rem] border border-border/80 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground text-sm">Your Prakriti</h2>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm",
                hasPrakriti ? "bg-herb-green/10 border-herb-green/20 text-herb-green" : "bg-neutral-100 text-muted-foreground"
              )}>{hasPrakriti ? "Assessed" : "Not Assessed"}</span>
            </div>
            <div className="flex gap-2 mb-4">
              {prakritiComposition.map((d) => (
                <div
                  key={d.dosha}
                  className={cn("flex-1 rounded-2xl p-3 text-center shadow-sm", d.color)}
                >
                  <p className="font-extrabold text-sm font-mono leading-none">{d.pct}%</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider mt-1">{d.dosha}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium mb-5">
              {prakritiAdvice}
            </p>
            <Link href="/prakriti" className="block">
              <button className={cn(
                "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98",
                hasPrakriti 
                  ? "bg-white border border-border text-foreground hover:bg-neutral-50" 
                  : "bg-herb-green text-white hover:bg-herb-green/90"
              )}>
                <span>{hasPrakriti ? "Retake Assessment" : "Discover Your Dosha"}</span>
                <span className="text-[10px]">→</span>
              </button>
            </Link>
          </div>

          {/* Top Practitioners */}
          <section className="bg-white rounded-[2rem] border border-border/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-foreground text-sm">Top Practitioners</h2>
              <Link href="/discover" className="text-xs text-herb-green font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-4">
              {(practitioners ?? []).slice(0, 3).map((doctor) => (
                <PractitionerCard key={doctor.id} doctor={doctor} compact />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
