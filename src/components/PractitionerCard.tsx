"use client";

import { useState } from "react";
import type { Practitioner } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Star, ShieldCheck, MapPin, Video, Calendar, Heart, Award, Languages, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PractitionerCardProps {
  doctor: Practitioner;
  compact?: boolean;
}

const disciplineStyles: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  Ayurveda: {
    bg: "bg-emerald-50 text-emerald-800 border-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-150",
    gradient: "from-emerald-500 to-teal-600",
  },
  Yoga: {
    bg: "bg-teal-50 text-teal-800 border-teal-100",
    text: "text-teal-700",
    border: "border-teal-150",
    gradient: "from-teal-500 to-cyan-600",
  },
  Naturopathy: {
    bg: "bg-amber-50 text-amber-850 border-amber-100",
    text: "text-amber-800",
    border: "border-amber-150",
    gradient: "from-amber-500 to-orange-500",
  },
  Unani: {
    bg: "bg-orange-50 text-orange-850 border-orange-100",
    text: "text-orange-800",
    border: "border-orange-150",
    gradient: "from-orange-500 to-red-500",
  },
  Siddha: {
    bg: "bg-purple-50 text-purple-800 border-purple-100",
    text: "text-purple-700",
    border: "border-purple-150",
    gradient: "from-purple-500 to-indigo-600",
  },
  Homeopathy: {
    bg: "bg-blue-50 text-blue-800 border-blue-100",
    text: "text-blue-700",
    border: "border-blue-150",
    gradient: "from-blue-500 to-indigo-600",
  },
};

function getFocusAreas(discipline: string, specialty: string): string[] {
  const defaults: Record<string, string[]> = {
    Ayurveda: ["Panchakarma", "Dosha Balance", "Detox Therapy", "Digestive Health"],
    Yoga: ["Therapeutic Yoga", "Pranayama", "Stress Management", "Mindfulness"],
    Naturopathy: ["Diet Therapy", "Hydrotherapy", "Lifestyle Correction", "Acupuncture"],
    Unani: ["Regimental Therapy", "Humoral Therapy", "Herbal Medicine", "Cupping"],
    Siddha: ["Varmam Therapy", "Kayakalpa", "Rejuvenation", "Pulse Diagnosis"],
    Homeopathy: ["Constitutional Care", "Chronic Disorders", "Micro-dose Remedies", "Allergy Care"],
  };
  
  const base = defaults[discipline] || defaults["Ayurveda"];
  if (specialty && specialty !== discipline) {
    // Put specialty first, filter duplicates
    return Array.from(new Set([specialty, ...base])).slice(0, 4);
  }
  return base;
}

export function PractitionerCard({ doctor, compact = false }: PractitionerCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const style = disciplineStyles[doctor.discipline] || {
    bg: "bg-neutral-50 text-neutral-850 border-neutral-200",
    text: "text-neutral-700",
    border: "border-neutral-200",
    gradient: "from-neutral-500 to-neutral-600",
  };

  const focusAreas = getFocusAreas(doctor.discipline, doctor.specialty);

  // Compact Layout (for Home page Dashboard sidebar)
  if (compact) {
    return (
      <div className="relative group bg-white rounded-2xl p-4 border border-neutral-100 shadow-xs hover:shadow-md hover:border-herb-green/30 transition-all duration-300">
        <div className="flex gap-3.5">
          {/* Left: Avatar with Live Status */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-xs font-display tracking-wider text-white font-extrabold text-sm",
              style.gradient
            )}>
              {doctor.avatar}
            </div>
            {/* Live Indicator */}
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          {/* Center: Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-bold text-foreground text-sm truncate group-hover:text-herb-green transition-colors leading-snug">
                {doctor.name}
              </h3>
              <div className="flex items-center gap-0.5 text-amber-500 flex-shrink-0 mt-0.5">
                <Star size={11} className="fill-amber-500" />
                <span className="text-xs font-bold font-mono">{doctor.rating}</span>
              </div>
            </div>

            <p className="text-[11px] font-medium text-muted-foreground truncate mt-0.5">{doctor.specialty}</p>

            <div className="flex gap-1.5 items-center mt-2.5">
              <span className={cn("text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md border", style.bg, style.border)}>
                {doctor.discipline}
              </span>
              {doctor.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/5 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-500/10">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer info row */}
        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Starts at</span>
            <span className="font-extrabold text-foreground font-mono text-sm">{formatCurrency(doctor.fee)}</span>
          </div>
          
          <Link href={`/doctor/${doctor.id}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-herb-green bg-herb-green/5 hover:bg-herb-green/10 px-3 py-1.5 rounded-xl border border-herb-green/15 transition-all">
            <span>Book Now</span>
            <ChevronRight size={10} />
          </Link>
        </div>
      </div>
    );
  }

  // Full-Width Row Layout (Discover Page)
  return (
    <div className="group bg-white rounded-[2rem] p-6.5 border border-neutral-150/70 shadow-xs hover:shadow-md hover:border-herb-green/20 transition-all duration-300 relative overflow-hidden">
      {/* Decorative aura on card hover */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-herb-green/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -mr-20 -mt-20 pointer-events-none" />

      {/* Main Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6 relative z-10">
        
        {/* Left Column: Avatar & Verification */}
        <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:w-28 flex-shrink-0">
          <div className="relative">
            <div className={cn(
              "w-20 h-20 lg:w-22 lg:h-22 rounded-2.5xl bg-gradient-to-br flex items-center justify-center shadow-md font-display tracking-wider text-white font-extrabold text-2xl relative transition-transform duration-300 group-hover:scale-103",
              style.gradient
            )}>
              {doctor.avatar}
            </div>
            
            {/* Live Indicator Dot */}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          <div className="flex flex-col items-start lg:items-center gap-1.5">
            {doctor.isVerified && (
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/8 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-500/15 shadow-2xs">
                <ShieldCheck size={11} className="stroke-[2.5]" />
                Verified
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-bold tracking-wide font-mono">
              {doctor.hprId.startsWith("HPR-PENDING") ? "HPR Pending" : doctor.hprId}
            </span>
          </div>
        </div>

        {/* Middle Column: Doctor Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-display font-extrabold text-foreground text-lg tracking-tight group-hover:text-herb-green transition-colors duration-200">
              {doctor.name}
            </h3>
            <span className="text-xs font-semibold text-muted-foreground leading-none">
              {doctor.qualifications.join(", ")}
            </span>
          </div>

          {/* Badges and Sub-Metadata */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
            <span className={cn("text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-lg border leading-none shadow-3xs", style.bg, style.border)}>
              {doctor.discipline}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-lg leading-none">
              <Award size={12} className="text-neutral-500" />
              {doctor.experience} yrs exp
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/90 font-medium">
              <Languages size={12} className="text-muted-foreground/60" />
              {doctor.languages.join(", ")}
            </span>
          </div>

          {/* Hospital/Clinic Location */}
          <p className="text-[11px] text-muted-foreground/90 font-medium flex items-center gap-1 mt-3">
            <MapPin size={12} className="text-muted-foreground/60" />
            <span>MeyVeda Wellness Center {doctor.location ? `· ${doctor.location}` : "· Online Support"}</span>
          </p>

          {/* Focus Area Tags */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {focusAreas.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200/50 px-2.5 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Consultation Modes */}
          <div className="flex gap-2.5 mt-4.5">
            {doctor.consultModes.includes("video") && (
              <span className="text-[10px] font-bold text-herb-green bg-herb-green/5 border border-herb-green/10 px-2.5 py-1 rounded-lg flex items-center gap-1 leading-none shadow-3xs">
                <Video size={12} />
                <span>Video Consult</span>
              </span>
            )}
            {doctor.consultModes.includes("clinic") && (
              <span className="text-[10px] font-bold text-copper bg-copper/5 border border-copper/10 px-2.5 py-1 rounded-lg flex items-center gap-1 leading-none shadow-3xs">
                🏥
                <span>In-Clinic Visit</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Rating, CTAs */}
        <div className="flex flex-row lg:flex-col justify-between lg:justify-between items-center lg:items-end lg:w-56 pt-5 lg:pt-0 border-t lg:border-t-0 border-neutral-150/70 flex-shrink-0 gap-4">
          {/* Top side: Rating & Wishlist */}
          <div className="flex items-center justify-between lg:justify-end gap-3 w-full">
            <div className="flex items-center gap-1 bg-amber-500/8 border border-amber-500/15 text-amber-700 px-3 py-1.5 rounded-xl shadow-3xs">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span className="text-xs font-extrabold font-mono leading-none">{doctor.rating}</span>
              <span className="text-[9px] text-amber-700/85 font-bold leading-none">({doctor.reviews} Reviews)</span>
            </div>

            {/* Wishlist toggle */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsFavorite(!isFavorite);
              }}
              className="p-2.5 rounded-xl border border-neutral-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer active:scale-90"
              title="Add to Wishlist"
            >
              <Heart
                size={14}
                className={cn("transition-colors duration-200", isFavorite ? "fill-red-500 text-red-500" : "text-neutral-500")}
              />
            </button>
          </div>

          {/* Pricing & Availability */}
          <div className="text-left lg:text-right w-full mt-0 lg:mt-3">
            <div className="flex items-baseline justify-between lg:justify-end gap-2 lg:gap-0 lg:flex-col">
              <div>
                <span className="text-[9px] text-muted-foreground uppercase font-extrabold tracking-widest block leading-none">Consultation Fee</span>
                <span className="text-xl font-black text-foreground font-mono tracking-tight mt-1.5 block">
                  {formatCurrency(doctor.fee)}
                </span>
              </div>

              <div className="flex items-center lg:justify-end gap-1 mt-1 lg:mt-3">
                <Calendar size={12} className="text-muted-foreground/60" />
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Next:</span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border leading-none ml-0.5 shadow-3xs",
                  doctor.nextAvailable.toLowerCase() === "today"
                    ? "bg-emerald-500/8 border-emerald-500/15 text-emerald-700"
                    : "bg-herb-green/5 border-herb-green/10 text-herb-green"
                )}>
                  {doctor.nextAvailable}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full mt-2">
            <Link href={`/doctor/${doctor.id}`} className="w-full">
              <button className="w-full py-2.5 px-4 bg-herb-green hover:bg-herb-green-light active:scale-98 font-bold text-xs text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer">
                Book Appointment
              </button>
            </Link>
            
            <Link href={`/doctor/${doctor.id}`} className="w-full">
              <button className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 active:scale-98 font-bold text-xs text-neutral-600 hover:text-foreground border border-neutral-200/85 rounded-xl transition-all cursor-pointer">
                View Profile
              </button>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
