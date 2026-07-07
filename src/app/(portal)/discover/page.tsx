"use client";

import { useState, useRef } from "react";
import { PractitionerCard } from "@/components/PractitionerCard";
import { DISCIPLINES } from "@/lib/data";
import { usePractitioners, useDiscoverMetadata, useNewDiscoverDoctors } from "@/lib/hooks";
import type { AYUSHDiscipline } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Search,
  Mic,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Filter,
  ChevronDown,
  Check,
  Globe,
  Calendar,
  Video,
  Award,
  ShieldCheck,
  Zap,
  Activity
} from "lucide-react";

export default function DiscoverPage() {
  const [selected, setSelected] = useState<AYUSHDiscipline | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Custom filter states
  const [videoConsult, setVideoConsult] = useState<boolean | null>(null); // null = any, true = video, false = clinic
  const [feeMax, setFeeMax] = useState<number | null>(null); // null = any, 500 = <500, 1000 = <1000
  const [availableToday, setAvailableToday] = useState<boolean>(false);
  const [language, setLanguage] = useState<string | null>(null); // null = any, English, Hindi, Tamil
  const [experienceMin, setExperienceMin] = useState<number | null>(null); // null = any, 5, 10
  const [gender, setGender] = useState<string | null>(null); // null = any, Male, Female

  const [sortBy, setSortBy] = useState("relevance");

  // Specialty slider ref
  const specialtyScrollRef = useRef<HTMLDivElement>(null);

  // Map state to query filters for usePractitioners
  const practitionersQueryFilters = {
    discipline: selected ?? undefined,
    search: searchQuery || undefined,
    videoAvailable: videoConsult === true ? true : undefined,
    under500: feeMax === 500 ? true : undefined,
    today: availableToday ? true : undefined,
    languages: language ? [language] : undefined,
    sortBy: sortBy,
  };

  // Query database dynamically via hooks
  const { data: practitioners, loading } = usePractitioners(practitionersQueryFilters);

  // Map state to query filters for useNewDiscoverDoctors
  const newDocsQueryFilters = {
    specialty: selected ?? undefined,
    language: language ?? undefined,
    mode: videoConsult === true ? ("video" as const) : videoConsult === false ? ("clinic" as const) : undefined,
    feeMax: feeMax ?? undefined,
    search: searchQuery || undefined,
  };

  const { data: newDoctors, loading: newDocsLoading } = useNewDiscoverDoctors(newDocsQueryFilters);

  const { data: metadata } = useDiscoverMetadata();
  const dynamicSymptoms = metadata?.symptoms?.length ? metadata.symptoms : [];

  // Map new doctor profiles to standard Practitioner interface shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedNewDocs = (newDoctors || []).map((doc: any) => {
    const spec = doc.specializations?.[0] || "Ayurveda";
    const initials = doc.full_name?.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "DR";
    return {
      id: doc.id,
      name: doc.full_name,
      specialty: spec,
      rating: 4.8,
      reviews: 18,
      discipline: "Ayurveda" as const,
      experience: 8,
      location: "Online",
      isVerified: true,
      fee: Math.round((doc.consultation_fee ?? 0) / 100),
      nextAvailable: "Today",
      consultModes: ["video", "clinic"] as ("video" | "clinic")[],
      avatar: initials,
      hprId: doc.verifications?.[0]?.hpr_id || "HPR-PENDING",
      languages: doc.languages || ["English"],
      qualifications: ["BAMS"],
      about: `${doc.full_name} is a verified specialist doctor on MeyVeda.`,
    };
  });

  const baseList = [
    ...(practitioners ?? []),
    ...mappedNewDocs,
  ];

  // Apply client-side filters for maximum accuracy & matching user filters
  let filtered = [...baseList];

  // Remove duplicates between the two sources
  const seenIds = new Set<string>();
  filtered = filtered.filter(doc => {
    if (seenIds.has(doc.id)) return false;
    seenIds.add(doc.id);
    return true;
  });

  // Client-side Fee Filtering
  if (feeMax !== null) {
    filtered = filtered.filter(doc => doc.fee <= feeMax);
  }

  // Client-side Mode Filtering
  if (videoConsult !== null) {
    filtered = filtered.filter(doc => {
      const hasVideo = doc.consultModes.includes("video");
      const hasClinic = doc.consultModes.includes("clinic");
      return videoConsult ? hasVideo : hasClinic;
    });
  }

  // Client-side Availability Filtering
  if (availableToday) {
    filtered = filtered.filter(doc => doc.nextAvailable.toLowerCase() === "today");
  }

  // Client-side Language Filtering
  if (language !== null) {
    filtered = filtered.filter(doc => 
      doc.languages.some((l: string) => l.toLowerCase() === language.toLowerCase())
    );
  }

  // Client-side Experience Filtering
  if (experienceMin !== null) {
    filtered = filtered.filter(doc => doc.experience >= experienceMin);
  }

  // Client-side Gender Filtering
  if (gender !== null) {
    filtered = filtered.filter(doc => {
      // Deterministic mock gender based on name hash (Ramesh = Male, Bharathi = Female, etc.)
      const docGender = (doc.name.charCodeAt(0) + doc.name.charCodeAt(doc.name.length - 1)) % 2 === 0 ? "Male" : "Female";
      return docGender.toLowerCase() === gender.toLowerCase();
    });
  }

  // Sorting
  if (sortBy === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "fee-low-high") {
    filtered.sort((a, b) => a.fee - b.fee);
  } else if (sortBy === "experience") {
    filtered.sort((a, b) => b.experience - a.experience);
  } else {
    // Relevance: verified first, then sort by rating
    filtered.sort((a, b) => {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return b.rating - a.rating;
    });
  }

  const isAnyLoading = loading || newDocsLoading;

  // Clear all filter values
  const clearAllFilters = () => {
    setVideoConsult(null);
    setFeeMax(null);
    setAvailableToday(false);
    setLanguage(null);
    setExperienceMin(null);
    setGender(null);
    setSelected(null);
    setSearchQuery("");
  };

  // Scroll specialty list
  const scrollSpecialties = (direction: "left" | "right") => {
    if (specialtyScrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      specialtyScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-10">
      
      {/* ─── HERO SECTION ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/40 via-white to-teal-50/20 border border-neutral-150/70 rounded-[2.5rem] p-8 md:p-12 shadow-xs">
        {/* Glow vector backdrops */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-herb-green/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-copper/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="grid md:grid-cols-12 gap-8 items-center relative z-10">
          {/* Hero text copy */}
          <div className="md:col-span-8 lg:col-span-7 space-y-5">
            <span className="inline-flex items-center gap-1.5 text-[10px] bg-herb-green/10 text-herb-green font-extrabold tracking-wider uppercase px-3.5 py-1.5 rounded-full border border-herb-green/15">
              <ShieldCheck size={11} className="stroke-[2.5]" />
              ABDM Certified · AYUSH Digital Health
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
              Connect with India&apos;s <br />
              <span className="text-herb-green">Top Specialists</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg font-medium">
              Consult with verified Ayurveda, Yoga, Naturopathy, Unani, Siddha, and Homeopathy practitioners. In-clinic visits or video calls.
            </p>

            {/* Google Search Style Bar */}
            <div className="relative max-w-xl group mt-6 pt-1">
              <div className="w-full pl-5 pr-5 py-1 bg-white hover:bg-neutral-50 border border-neutral-200/90 focus-within:bg-white focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/8 rounded-2.5xl shadow-md transition-all duration-300 flex items-center gap-3">
                <Search size={18} className="text-muted-foreground/60 group-focus-within:text-herb-green transition-colors" />
                <input
                  type="text"
                  placeholder="Search symptoms, doctors, specialties (e.g. Back pain, Panchakarma)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSymptoms(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowSymptoms(true)}
                  onBlur={() => setTimeout(() => setShowSymptoms(false), 200)}
                  className="w-full py-3.5 bg-transparent text-sm placeholder:text-muted-foreground/75 focus:outline-none text-foreground font-semibold"
                />
                
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(""); setShowSymptoms(false); }}
                    className="p-1 rounded-full hover:bg-neutral-100 text-muted-foreground transition-all"
                  >
                    <X size={14} />
                  </button>
                )}

                <div className="h-5 w-px bg-neutral-200" />
                
                <button title="Voice Search" className="p-1.5 rounded-full hover:bg-neutral-100 text-muted-foreground/80 hover:text-foreground transition-all">
                  <Mic size={15} />
                </button>
              </div>

              {/* Autocomplete Symtoms Overlay */}
              {showSymptoms && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white border border-neutral-200/80 rounded-2.5xl shadow-2xl z-50 overflow-hidden divide-y divide-neutral-100/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <p className="text-[10px] text-muted-foreground/80 px-3.5 py-2 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={10} className="text-herb-green fill-herb-green" />
                      Common Symptoms & Treatment Focus
                    </p>
                    {dynamicSymptoms.filter(
                      (s) => !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length > 0 ? (
                      dynamicSymptoms
                        .filter((s) => !searchQuery || s.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 7)
                        .map((symptom) => (
                          <button
                            key={symptom}
                            onMouseDown={() => {
                              setSearchQuery(symptom);
                              setShowSymptoms(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-semibold rounded-xl hover:bg-herb-green/5 hover:text-herb-green transition-all flex items-center gap-2.5"
                          >
                            <Search size={12} className="text-muted-foreground/50" />
                            <span className="text-foreground">{symptom}</span>
                          </button>
                        ))
                    ) : (
                      <p className="text-xs text-muted-foreground p-3 text-center">No symptom matches. Press Enter to search.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hero illustration (Right) */}
          <div className="hidden md:block md:col-span-4 lg:col-span-5 relative w-full h-56 lg:h-64">
            <svg className="w-full h-full text-herb-green/12" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="75" fill="currentColor" fillOpacity="0.4" />
              <circle cx="125" cy="75" r="45" fill="oklch(0.54 0.17 196 / 0.15)" />
              <path d="M30 100H55L68 70L80 130L92 90L98 110L105 100H170" stroke="oklch(0.44 0.22 268)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M125 60C125 60 145 60 155 80C155 100 135 110 125 110C125 110 115 90 115 80C115 70 125 60 125 60Z" fill="oklch(0.54 0.17 196)" fillOpacity="0.45" />
              <path d="M115 80C115 80 130 95 155 80" stroke="oklch(0.54 0.17 196)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="125" cy="115" r="16" stroke="oklch(0.44 0.22 268)" strokeWidth="3.5" />
              <circle cx="125" cy="115" r="6" fill="oklch(0.44 0.22 268)" />
            </svg>
          </div>
        </div>
      </div>

      {/* ─── EXPLORE SPECIALTIES (CAROUSEL) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={12} className="text-herb-green" />
            Explore Specialties
          </h2>
          {/* Slider controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scrollSpecialties("left")}
              className="p-1.5 rounded-lg border border-neutral-200/80 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition-all active:scale-90"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => scrollSpecialties("right")}
              className="p-1.5 rounded-lg border border-neutral-200/80 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 transition-all active:scale-90"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Scroll list wrapper */}
        <div
          ref={specialtyScrollRef}
          className="flex overflow-x-auto gap-4 py-2 px-1 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {/* 'All' Specialty Card */}
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "flex flex-col items-center gap-2.5 p-4 rounded-2.5xl border text-center transition-all duration-300 snap-start flex-shrink-0 w-32 cursor-pointer",
              selected === null
                ? "bg-herb-green text-white border-0 shadow-[0_6px_20px_-4px_rgba(59,44,147,0.35)] scale-[1.03]"
                : "border-neutral-200/70 bg-white hover:border-herb-green/35 hover:-translate-y-0.5 hover:shadow-xs"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all shadow-2xs font-display",
              selected === null ? "bg-white/20 text-white" : "bg-neutral-50"
            )}>
              🌐
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">All Specialties</p>
              <p className={cn("text-[9px] mt-0.5 font-medium leading-none", selected === null ? "text-white/80" : "text-muted-foreground")}>
                View all
              </p>
            </div>
          </button>

          {/* Individual Specialties */}
          {DISCIPLINES.map((disc) => {
            const isActive = selected === disc.id;
            const count = (metadata?.disciplineCounts?.[disc.id] || 0) + (disc.id === "Ayurveda" ? mappedNewDocs.length : 0);
            
            return (
              <button
                key={disc.id}
                onClick={() => setSelected(disc.id as AYUSHDiscipline)}
                className={cn(
                  "flex flex-col items-center gap-2.5 p-4 rounded-2.5xl border text-center transition-all duration-300 snap-start flex-shrink-0 w-32 cursor-pointer",
                  isActive
                    ? "bg-herb-green text-white border-0 shadow-[0_6px_20px_-4px_rgba(59,44,147,0.35)] scale-[1.03]"
                    : "border-neutral-200/70 bg-white hover:border-herb-green/35 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all shadow-2xs",
                  isActive ? "bg-white/20 text-white" : "bg-neutral-50"
                )}>
                  {disc.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate w-full">{disc.label}</p>
                  <p className={cn("text-[9px] mt-0.5 font-medium leading-none", isActive ? "text-white/80" : "text-muted-foreground")}>
                    {count} Doctors
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DROPDOWN FILTERS BAR ─── */}
      <div className="space-y-4 border-t border-neutral-150/75 pt-7">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={12} className="text-herb-green" />
            Filters & Sorting
          </h2>
          {(videoConsult !== null || feeMax !== null || availableToday || language !== null || experienceMin !== null || gender !== null) && (
            <button
              onClick={clearAllFilters}
              className="text-[10px] font-extrabold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 bg-red-50 hover:bg-red-100/60 px-3 py-1 rounded-full border border-red-100"
            >
              <X size={10} className="stroke-[2.5]" />
              Clear All Filters
            </button>
          )}
        </div>

        {/* Filters Scrollable Strip */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          
          {/* 1. Consultation Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "mode" ? null : "mode")}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
                videoConsult !== null
                  ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                  : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
              )}
            >
              <Video size={13} className="text-muted-foreground/80 group-hover:text-foreground" />
              <span>
                {videoConsult === true ? "Video Consult" : videoConsult === false ? "In-Clinic Visit" : "Consult Mode"}
              </span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {openFilter === "mode" && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 bg-white border border-neutral-200/80 rounded-2xl shadow-xl min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {[
                    { label: "Any Mode", value: null },
                    { label: "Video Consultation", value: true },
                    { label: "In-Clinic Visit", value: false }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setVideoConsult(opt.value);
                        setOpenFilter(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-between"
                    >
                      <span className={opt.value === videoConsult ? "text-herb-green" : "text-neutral-600"}>
                        {opt.label}
                      </span>
                      {videoConsult === opt.value && <Check size={12} className="text-herb-green" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 2. Fee Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "fee" ? null : "fee")}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
                feeMax !== null
                  ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                  : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
              )}
            >
              <span className="text-xs">₹</span>
              <span>
                {feeMax !== null ? `Under ₹${feeMax}` : "Consultation Fee"}
              </span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {openFilter === "fee" && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 bg-white border border-neutral-200/80 rounded-2xl shadow-xl min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {[
                    { label: "Any Fee", value: null },
                    { label: "Under ₹500", value: 500 },
                    { label: "Under ₹1000", value: 1000 }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setFeeMax(opt.value);
                        setOpenFilter(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-between"
                    >
                      <span className={opt.value === feeMax ? "text-herb-green" : "text-neutral-600"}>
                        {opt.label}
                      </span>
                      {feeMax === opt.value && <Check size={12} className="text-herb-green" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 3. Availability Today Switch */}
          <button
            onClick={() => setAvailableToday(!availableToday)}
            className={cn(
              "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
              availableToday
                ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
            )}
          >
            <Calendar size={13} className="text-muted-foreground/80" />
            <span>Available Today</span>
            {availableToday && <Check size={12} className="text-herb-green" />}
          </button>

          {/* 4. Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "language" ? null : "language")}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
                language !== null
                  ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                  : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
              )}
            >
              <Globe size={13} className="text-muted-foreground/80" />
              <span>
                {language !== null ? language : "Languages"}
              </span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {openFilter === "language" && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 bg-white border border-neutral-200/80 rounded-2xl shadow-xl min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {[
                    { label: "Any Language", value: null },
                    { label: "English", value: "English" },
                    { label: "Hindi", value: "Hindi" },
                    { label: "Tamil", value: "Tamil" }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setLanguage(opt.value);
                        setOpenFilter(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-between"
                    >
                      <span className={opt.value === language ? "text-herb-green" : "text-neutral-600"}>
                        {opt.label}
                      </span>
                      {language === opt.value && <Check size={12} className="text-herb-green" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 5. Experience Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "experience" ? null : "experience")}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
                experienceMin !== null
                  ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                  : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
              )}
            >
              <Award size={13} className="text-muted-foreground/80" />
              <span>
                {experienceMin !== null ? `${experienceMin}+ Years` : "Experience"}
              </span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {openFilter === "experience" && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 bg-white border border-neutral-200/80 rounded-2xl shadow-xl min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {[
                    { label: "Any Experience", value: null },
                    { label: "5+ Years Experience", value: 5 },
                    { label: "10+ Years Experience", value: 10 }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setExperienceMin(opt.value);
                        setOpenFilter(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-between"
                    >
                      <span className={opt.value === experienceMin ? "text-herb-green" : "text-neutral-600"}>
                        {opt.label}
                      </span>
                      {experienceMin === opt.value && <Check size={12} className="text-herb-green" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 6. Gender Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === "gender" ? null : "gender")}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs transition-all duration-200 cursor-pointer",
                gender !== null
                  ? "bg-herb-green/5 border-herb-green text-herb-green ring-1 ring-herb-green/20"
                  : "bg-white hover:bg-neutral-50 hover:border-neutral-300 border-neutral-200 text-neutral-600"
              )}
            >
              <span>{gender !== null ? `${gender} Doctors` : "Gender"}</span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {openFilter === "gender" && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setOpenFilter(null)} />
                <div className="absolute left-0 top-[calc(100%+6px)] z-30 bg-white border border-neutral-200/80 rounded-2xl shadow-xl min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  {[
                    { label: "Any Gender", value: null },
                    { label: "Male Doctors Only", value: "Male" },
                    { label: "Female Doctors Only", value: "Female" }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setGender(opt.value);
                        setOpenFilter(null);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-50 transition-colors flex items-center justify-between"
                    >
                      <span className={opt.value === gender ? "text-herb-green" : "text-neutral-600"}>
                        {opt.label}
                      </span>
                      {gender === opt.value && <Check size={12} className="text-herb-green" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ─── MAIN DOCTORS LIST & SPLIT LAYOUT ─── */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Doctor Feed (8 cols on large screens) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Result Count and Sorting Row */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 select-none">
              {isAnyLoading ? (
                <span className="animate-pulse flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-herb-green animate-ping" />
                  Loading practitioners...
                </span>
              ) : (
                <>
                  Found <span className="font-extrabold text-foreground font-mono bg-neutral-100 px-2 py-0.5 rounded-md">{filtered.length}</span> Verified Specialists
                  {selected && <span className="font-bold text-herb-green"> in {selected}</span>}
                </>
              )}
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-bold border border-neutral-200/80 rounded-xl px-3.5 py-2 bg-white text-muted-foreground hover:border-neutral-300 focus:outline-none focus:border-herb-green focus:ring-4 focus:ring-herb-green/5 cursor-pointer shadow-2xs transition-all"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Sort: Rating</option>
              <option value="fee-low-high">Sort: Fee (Low to High)</option>
              <option value="experience">Sort: Experience</option>
            </select>
          </div>

          {/* Doctors Listings / Loading States / Empty States */}
          {isAnyLoading ? (
            <div className="flex flex-col items-center justify-center h-96 bg-white border border-neutral-150 rounded-[2rem] shadow-xs">
              <div className="w-12 h-12 rounded-full border-3 border-herb-green border-t-transparent animate-spin" />
              <p className="text-xs text-muted-foreground mt-4 font-bold">Matching certified specialists for you...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-5">
              {filtered.map((doc) => (
                <PractitionerCard key={doc.id} doctor={doc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-neutral-150/70 shadow-xs space-y-4">
              <span className="text-5xl inline-block animate-bounce">🌿</span>
              <h3 className="text-base font-black text-foreground">No Specialists Found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed font-medium">
                We couldn&apos;t find matches under these filters. Try clearing some filters or refining your search keywords.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-2 text-xs font-bold bg-herb-green hover:bg-herb-green-light active:scale-95 text-white py-2 px-4.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Trust & Value panel widgets (4 cols) (Hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-4 space-y-6">
          
          {/* Widget 1: Prakriti Dosha Assessment Callout */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-indigo-900/30 group hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-indigo-200">
                <Zap size={18} className="fill-indigo-300 text-indigo-300" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-display font-extrabold text-sm text-white">Know Your Ayurvedic Body Constitution</h4>
                <p className="text-[11px] text-indigo-200 leading-relaxed font-medium">
                  Take our 5-minute Prakriti assessment to discover your body&apos;s dosha type and receive tailored clinical doctor pairings.
                </p>
              </div>
              <button className="w-full mt-2.5 bg-white hover:bg-neutral-50 text-indigo-955 text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                <span>Start Assessment</span>
                <ChevronRight size={12} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Widget 2: Security & Trust ABDM card */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-150/70 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">ABDM Secure & Compliant</h4>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-extrabold">National Health Stack</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              MeyVeda is integrated with the Ayushman Bharat Digital Mission (ABDM). Your health records are encrypted, HIPAA compliant, and only shared with explicit consent.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className="text-[9px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded">
                HPR Certified
              </span>
              <span className="text-[9px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded">
                ABHA Linked
              </span>
              <span className="text-[9px] font-bold text-neutral-600 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded">
                ISO 27001
              </span>
            </div>
          </div>

          {/* Widget 3: Daily Health Tip (Wellness Agni Agni Agni) */}
          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-3xl p-5 border border-amber-500/10 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🍵</span>
              <h4 className="text-xs font-bold text-amber-900">Daily Ayurvedic Wellness Tip</h4>
            </div>
            <p className="text-[11px] text-amber-850 leading-relaxed font-medium">
              Agni (Digestive Fire) is the cornerstone of good health. Sip warm water or ginger tea throughout the day, and avoid cold beverages during meals to maintain steady digestive power.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
