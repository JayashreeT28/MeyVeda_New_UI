"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HPRBadge } from "@/components/Badges";
import {
  usePractitioner,
  usePractitionerSlots,
  useReviews,
  usePractitionerAvailableDates,
  useNewDoctorProfile,
  useNewDoctorSlots,
  useNewDoctorAvailableDates,
} from "@/lib/hooks";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Star,
  ShieldCheck,
  Award,
  Languages,
  MapPin,
  Video,
  ChevronRight,
  User,
  Sunrise,
  Sun,
  Sunset,
  Calendar,
  Check,
  Heart,
  Share2,
  ExternalLink,
  BookOpen,
  Briefcase
} from "lucide-react";

function getPeriod(timeStr: string): "Morning" | "Afternoon" | "Evening" {
  const isPM = timeStr.toLowerCase().includes("pm");
  const hour = parseInt(timeStr.split(":")[0]);
  if (!isPM) {
    return "Morning";
  } else {
    if (hour === 12 || hour < 4) {
      return "Afternoon";
    }
    return "Evening";
  }
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

export default function DoctorProfileClient() {
  const { id } = useParams<{ id: string }>();
  const [wishlisted, setWishlisted] = useState(false);

  // Fetch legacy doctor
  const { data: legacyDoc, loading: legacyDocLoading } = usePractitioner(id);

  // Fetch new doctor profile
  const { data: newDoc, loading: newDocLoading } = useNewDoctorProfile(id);

  const isLegacy = !!legacyDoc;

  // Resolve Doctor summary
  const doctor = legacyDoc
    ? legacyDoc
    : newDoc
    ? {
        id: newDoc.id,
        name: newDoc.full_name,
        specialty: newDoc.specializations?.[0] || "Ayurveda",
        rating: 4.9,
        reviews: 1284,
        experience: 15,
        location: "Online",
        isVerified: true,
        fee: Math.round((newDoc.consultation_fee ?? 0) / 100),
        nextAvailable: "Today",
        languages: newDoc.languages || ["English", "Hindi", "Kannada"],
        about: `${newDoc.full_name} is a dedicated AYUSH practitioner specializing in Classical Ayurveda.`,
        qualifications: ["BAMS", "MD Ayurveda", "PG Panchakarma"],
        hprId: newDoc.verifications?.[0]?.hpr_id || "HPR-4902-8822",
        avatar: newDoc.full_name?.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "DA",
        isNewDoctor: true,
        discipline: "Ayurveda",
      }
    : null;

  const style = doctor
    ? disciplineStyles[doctor.discipline] || {
        bg: "bg-neutral-50 text-neutral-850 border-neutral-200",
        text: "text-neutral-700",
        border: "border-neutral-200",
        gradient: "from-neutral-500 to-neutral-600",
      }
    : { bg: "", text: "", border: "", gradient: "" };

  const [selectedDateState, setSelectedDateState] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; startTime: string; mode: "video" | "clinic" } | null>(null);

  // Available dates queries
  const { data: legacyDates, loading: legacyDatesLoading } = usePractitionerAvailableDates(id);
  const { data: newDates, loading: newDatesLoading } = useNewDoctorAvailableDates(id);

  const rawAvailableDates = isLegacy ? legacyDates : newDates;
  const datesLoading = isLegacy ? legacyDatesLoading : newDatesLoading;

  const dynamicDates = useMemo(() => {
    if (!rawAvailableDates) return [];
    return rawAvailableDates.map((dateStr) => {
      const d = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = d.toDateString() === today.toDateString();
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      return {
        label: isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        full: dateStr,
      };
    });
  }, [rawAvailableDates]);

  const selectedDate = selectedDateState || dynamicDates[0]?.full || "";

  // Fetch slots and reviews dynamically
  const legacySlotsQuery = usePractitionerSlots(id, selectedDate);
  const newSlotsQuery = useNewDoctorSlots(id, selectedDate);

  const slots = isLegacy ? (legacySlotsQuery.data ?? []) : (newSlotsQuery.data ?? []);
  const slotsLoading = isLegacy ? legacySlotsQuery.loading : newSlotsQuery.loading;

  const { data: rawReviews, loading: reviewsLoading } = useReviews(id);
  const reviews = rawReviews ?? [];

  if (legacyDocLoading && newDocLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 rounded-full border-3 border-herb-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-neutral-150 shadow-sm max-w-md mx-auto my-12 space-y-4">
        <span className="text-6xl inline-block animate-bounce">🌿</span>
        <h3 className="text-base font-black text-foreground">Practitioner Not Found</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
          We couldn&apos;t find this healthcare practitioner in our registry database.
        </p>
        <Link href="/discover" className="inline-block mt-2">
          <button className="px-5 py-2.5 bg-herb-green hover:bg-herb-green-light active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer">
            Back to Discover
          </button>
        </Link>
      </div>
    );
  }

  // Group slots by Morning, Afternoon, Evening
  const groupedSlots: Record<"Morning" | "Afternoon" | "Evening", typeof slots> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  slots.forEach((slot) => {
    const period = getPeriod(slot.startTime);
    groupedSlots[period].push(slot);
  });

  const totalSlotsCount = slots.length;
  const canBook = selectedSlot !== null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      
      {/* ─── BREADCRUMB & METADATA ACTIONS ─── */}
      <div className="flex items-center justify-between gap-4 text-xs font-semibold select-none flex-wrap">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Link href="/discover" className="hover:text-foreground transition-colors">Discover</Link>
          <ChevronRight size={10} className="stroke-[2.5]" />
          <span className="text-foreground font-bold">{doctor.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWishlisted(!wishlisted)}
            className="p-2.5 rounded-xl border border-neutral-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            title="Wishlist"
          >
            <Heart size={14} className={cn("transition-colors duration-200", wishlisted ? "fill-red-500 text-red-500" : "text-neutral-500")} />
            <span className="hidden sm:inline text-neutral-600">Save Doctor</span>
          </button>
          
          <button className="p-2.5 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 text-neutral-600">
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* ─── PROFILE BODY LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* LEFT COLUMN: HERO DETAILS & TABS */}
        <div className="space-y-6">
          
          {/* Overhauled Doctor Profile Hero Card */}
          <div className="bg-white rounded-3xl border border-neutral-150/70 p-6.5 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden">
            {/* Glowing aura */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-herb-green/5 rounded-full blur-3xl opacity-0 hover:opacity-100 transition-opacity duration-300 -mr-12 -mt-12 pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 mb-6">
              {/* Profile Image Avatar Grid */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-22 h-22 rounded-2.5xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-2xl font-display shadow-md tracking-wider relative transition-transform duration-300 hover:scale-103",
                  style.gradient
                )}>
                  {doctor.avatar}
                </div>
                
                {/* Live Online status dot indicator */}
                <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white flex items-center justify-center shadow-md select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping opacity-75" />
                </span>
              </div>

              {/* Identity details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="font-display text-2xl font-black text-foreground tracking-tight leading-none">
                    {doctor.name}
                  </h1>
                  {doctor.isVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/5 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-500/15 shadow-3xs leading-none select-none">
                      <ShieldCheck size={10} className="stroke-[2.5]" />
                      HPR Verified
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-herb-green uppercase tracking-widest leading-none">
                  {doctor.specialty}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap select-none">
                  <HPRBadge hprId={doctor.hprId} showId className="shadow-3xs bg-herb-green text-white font-extrabold" />
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-4 mt-2.5 text-xs text-muted-foreground font-semibold flex-wrap">
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    <span className="font-bold text-foreground font-mono">{doctor.rating}</span> 
                    <span className="opacity-75">({doctor.reviews} Patient Reviews)</span>
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} className="text-neutral-400" />
                    <span>{doctor.experience} yrs exp</span>
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-neutral-400" />
                    <span>MeyVeda Center · {doctor.location || "Online"}</span>
                  </span>
                </div>
              </div>

              {/* Consultation Fee Callout */}
              <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0 select-none bg-neutral-50/50 p-4 border border-neutral-150/70 rounded-2xl">
                <p className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-widest">Consultation Fee</p>
                <p className="font-display text-2xl font-black text-foreground tracking-tight mt-1 leading-none font-mono">
                  {formatCurrency(doctor.fee)}
                </p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded mt-2.5 leading-none">
                  Slots available: {doctor.nextAvailable}
                </span>
              </div>
            </div>

            {/* Redesigned Info Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 border-t border-neutral-100 pt-5 select-none">
              {/* Stat 1: Experience */}
              <div className="bg-neutral-50/60 border border-neutral-150/50 rounded-2xl p-3 flex items-center gap-3.5 transition-colors hover:bg-neutral-50">
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center text-herb-green shadow-3xs flex-shrink-0">
                  <Award size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-foreground">{doctor.experience} Years</h4>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5 font-semibold">Clinical Practice</p>
                </div>
              </div>

              {/* Stat 2: Consultations */}
              <div className="bg-neutral-50/60 border border-neutral-150/50 rounded-2xl p-3 flex items-center gap-3.5 transition-colors hover:bg-neutral-50">
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center text-herb-green shadow-3xs flex-shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-foreground">1,280+</h4>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5 font-semibold">Successful Consults</p>
                </div>
              </div>

              {/* Stat 3: Languages */}
              <div className="bg-neutral-50/60 border border-neutral-150/50 rounded-2xl p-3 flex items-center gap-3.5 transition-colors hover:bg-neutral-50">
                <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center text-herb-green shadow-3xs flex-shrink-0">
                  <Languages size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-foreground truncate">{doctor.languages.slice(0, 2).join(", ")}</h4>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5 font-semibold">Spoken Languages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Redesigned Segmented Control Tabs */}
          <Tabs defaultValue="about">
            <TabsList className="bg-neutral-100/70 p-1.5 rounded-2xl flex gap-1.5 border border-neutral-200/30 w-fit select-none shadow-3xs mb-6">
              <TabsTrigger value="about" className="py-2.5 px-6 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-herb-green data-[state=active]:shadow-xs hover:bg-white/20 transition-all cursor-pointer">
                About
              </TabsTrigger>
              <TabsTrigger value="reviews" className="py-2.5 px-6 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-herb-green data-[state=active]:shadow-xs hover:bg-white/20 transition-all cursor-pointer">
                Patient Reviews ({reviews.length})
              </TabsTrigger>
              <TabsTrigger value="clinic" className="py-2.5 px-6 text-xs font-bold rounded-xl data-[state=active]:bg-white data-[state=active]:text-herb-green data-[state=active]:shadow-xs hover:bg-white/20 transition-all cursor-pointer">
                Clinic Location
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ABOUT */}
            <TabsContent value="about" className="space-y-4 outline-none">
              <div className="bg-white rounded-3xl p-6.5 border border-neutral-150/70 shadow-2xs">
                <h3 className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-widest mb-3.5 flex items-center gap-1.5 select-none">
                  <User size={13} className="text-herb-green" />
                  Professional Summary
                </h3>
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-semibold">
                  {doctor.about}
                </p>
              </div>
              
              <div className="bg-white rounded-3xl p-6.5 border border-neutral-150/70 shadow-2xs">
                <h3 className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-widest mb-4.5 flex items-center gap-1.5 select-none">
                  <Award size={13} className="text-herb-green" />
                  Credentials & Qualifications
                </h3>
                <div className="flex flex-wrap gap-2 select-none">
                  {doctor.qualifications.map((q) => (
                    <span key={q} className="inline-flex items-center gap-1 text-xs bg-herb-green/5 text-herb-green border border-herb-green/12 px-3 py-2 rounded-xl font-bold shadow-3xs">
                      <Check size={11} className="stroke-[2.5]" />
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: REVIEWS */}
            <TabsContent value="reviews" className="space-y-4 outline-none">
              {reviewsLoading ? (
                <div className="text-center text-xs text-muted-foreground py-10 bg-white rounded-3xl border border-neutral-150">
                  <div className="w-6 h-6 rounded-full border-2 border-herb-green border-t-transparent animate-spin mx-auto mb-2" />
                  Loading feedback reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-12 bg-white rounded-3xl border border-neutral-150 shadow-2xs select-none">
                  ⭐ No patient reviews submitted yet.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Reviews Summary Stats Card */}
                  <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 rounded-3xl p-5 border border-amber-500/10 flex items-center gap-5 select-none">
                    <div className="text-center bg-white border border-amber-200/80 rounded-2xl p-4.5 shadow-3xs flex-shrink-0">
                      <h4 className="text-3xl font-black text-amber-600 font-mono tracking-tight">{doctor.rating}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase font-extrabold tracking-wider mt-1">Rating Average</p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Verified Consultation Reviews</h4>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Feedback is collected from patients who booked and successfully concluded consultations with {doctor.name}.
                      </p>
                    </div>
                  </div>

                  {/* Reviews Cards List */}
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-3xl p-5 border border-neutral-150/70 shadow-2xs hover:border-neutral-200 transition-colors">
                      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-3.5 mb-3.5 select-none flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center font-display text-xs font-extrabold text-neutral-600">
                            {review.patientName[0]}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground">{review.patientName}</span>
                            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Verified Patient</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: review.stars }).map((_, j) => (
                              <Star key={j} size={11} className="fill-amber-500 text-amber-500" />
                            ))}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-bold font-mono">{new Date(review.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-700 leading-relaxed font-semibold">{review.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: CLINIC */}
            <TabsContent value="clinic" className="outline-none">
              <div className="bg-white rounded-3xl p-6.5 border border-neutral-150/70 shadow-2xs space-y-5">
                <div className="flex gap-4 items-start select-none">
                  <div className="w-10 h-10 rounded-xl bg-herb-green/10 flex items-center justify-center text-herb-green shadow-3xs flex-shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Primary Consultation Center</h3>
                    <p className="text-sm font-extrabold text-foreground mt-1">{doctor.location || "Online Consultations"}</p>
                    <p className="text-xs text-muted-foreground leading-normal mt-0.5">MeyVeda Wellness Clinics, Sector 4 Block C, Bengaluru</p>
                  </div>
                </div>

                {/* Vector Map Mockup Placeholder Card */}
                <div className="relative h-44 rounded-2xl bg-neutral-50 border border-neutral-200 overflow-hidden flex items-center justify-center shadow-3xs select-none">
                  {/* Mock Map Vector Graphics */}
                  <svg className="absolute inset-0 w-full h-full text-neutral-200/70" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 40H400M0 100H400M0 160H400" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M60 0V200M180 0V200M320 0V200" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M0 0L400 200M400 0L0 200" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                  </svg>
                  <div className="relative z-10 flex flex-col items-center gap-2 bg-white/95 border border-neutral-200 p-3 rounded-2xl shadow-md max-w-[200px] text-center">
                    <MapPin size={16} className="text-red-500 fill-red-500 animate-bounce" />
                    <span className="text-[10px] font-bold text-foreground">Clinic Address Link</span>
                    <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-[9px] text-herb-green font-extrabold flex items-center gap-0.5 hover:underline">
                      <span>Google Maps</span>
                      <ExternalLink size={8} />
                    </a>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-4 border border-indigo-100 text-indigo-900 rounded-2xl text-xs flex gap-2.5 items-start shadow-3xs select-none">
                  <Video size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-[11px]">Telehealth Consultation Available</h5>
                    <p className="text-[10px] leading-normal font-semibold">
                      This doctor also provides HIPAA-compliant encrypted video consultations from the comfort of your home.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN: SLOT BOOKING SIDEBAR CARD */}
        <div>
          <div className="bg-white rounded-3xl border border-neutral-150 p-5.5 shadow-2xs top-24 sticky hover:shadow-xs transition-shadow duration-300 space-y-5 select-none">
            <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-herb-green" />
              Select Date & Slot
            </h3>

            {/* Dates Slider Horizontal */}
            <div className="flex gap-2 overflow-x-auto pb-3 border-b border-neutral-100 scrollbar-none" style={{ scrollbarWidth: "none" }}>
              {datesLoading ? (
                <div className="text-center w-full py-3 text-xs text-muted-foreground">Loading dates...</div>
              ) : dynamicDates.length === 0 ? (
                <div className="text-center w-full py-3 text-xs text-muted-foreground">No available dates.</div>
              ) : (
                dynamicDates.map((d) => {
                  const isActive = selectedDate === d.full;
                  return (
                    <button
                      key={d.full}
                      onClick={() => {
                        setSelectedDateState(d.full);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer active:scale-95",
                        isActive
                          ? "bg-herb-green border-herb-green text-white shadow-xs scale-103"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-herb-green/45 hover:shadow-3xs"
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase opacity-80">{d.label}</span>
                      <span className="text-lg font-black font-display tracking-tight leading-none mt-1">{d.date}</span>
                      <span className="text-[9px] font-semibold uppercase opacity-85 mt-0.5">{d.month}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Grouped slots block */}
            <div className="space-y-4">
              {slotsLoading ? (
                <div className="text-center text-xs text-muted-foreground py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-herb-green border-t-transparent animate-spin mx-auto mb-2" />
                  Loading available slots...
                </div>
              ) : totalSlotsCount === 0 ? (
                <div className="text-center text-xs text-amber-600 bg-amber-50 rounded-xl p-4 border border-amber-100 font-semibold leading-relaxed">
                  ⚠️ No open consultation slots found on this date.
                </div>
              ) : (
                Object.entries(groupedSlots).map(([period, periodSlots]) => {
                  if (periodSlots.length === 0) return null;
                  
                  const periodIcon = period === "Morning" ? <Sunrise size={13} className="text-amber-500" /> :
                                     period === "Afternoon" ? <Sun size={13} className="text-orange-500" /> :
                                     <Sunset size={13} className="text-indigo-500" />;

                  return (
                    <div key={period} className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest flex items-center gap-1 border-b border-neutral-50 pb-1">
                        {periodIcon}
                        <span>{period}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {periodSlots.map((slot) => {
                          const isActiveSlot = selectedSlot?.id === slot.id;
                          const isVideo = slot.mode === "video";
                          
                          return (
                            <button
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot)}
                              className={cn(
                                "text-xs px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95",
                                isActiveSlot
                                  ? "bg-herb-green text-white border-herb-green font-bold shadow-3xs"
                                  : isVideo
                                  ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/15 text-emerald-700 font-semibold"
                                  : "bg-copper/5 hover:bg-copper/10 border-copper/20 text-copper font-semibold"
                              )}
                            >
                              <span className="flex items-center gap-1 font-mono">
                                {isVideo ? <Video size={10} /> : "🏥"}
                                {slot.startTime}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Booking action panel */}
            <div className="pt-4 border-t border-neutral-100 select-none">
              <Link
                href={
                  canBook && selectedSlot
                    ? `/booking?doctor=${doctor.id}&slot=${selectedSlot.startTime}&slotId=${selectedSlot.id}&date=${selectedDate}&mode=${selectedSlot.mode}`
                    : "#"
                }
                className="w-full"
              >
                <button
                  disabled={!canBook}
                  className={cn(
                    "w-full py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    canBook
                      ? "bg-herb-green hover:bg-herb-green-light active:scale-95 text-white shadow-xs hover:shadow-md"
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200/60"
                  )}
                >
                  <span>
                    {canBook && selectedSlot 
                      ? `Book at ${selectedSlot.startTime} · ${formatCurrency(doctor.fee)}` 
                      : "Select a Time Slot"}
                  </span>
                  {canBook && <ChevronRight size={12} className="stroke-[2.5]" />}
                </button>
              </Link>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
