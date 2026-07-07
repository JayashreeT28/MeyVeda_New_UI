"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase";
import { sendOtp, verifyOtp } from "@/lib/otp-client";
import { savePatientProfile, saveDoctorProfileAndVerification } from "@/lib/queries";
import { toast } from "react-hot-toast";
import { Upload, Shield, Award, User, Heart, AlertCircle, FileText, CheckCircle } from "lucide-react";

type Step =
  | "welcome"
  | "phone"
  | "otp"
  | "role"
  | "abha"
  | "patient-intake"
  | "doctor-intake"
  | "doctor-documents"
  | "success";

type Flow = "new" | "returning";

const AYUSH_QUALIFICATIONS = ["BAMS", "BHMS", "BUMS", "BNYS", "BSMS", "MD (Ayu)", "MS (Ayu)", "PhD"];
const AYUSH_SPECIALTIES = [
  "Kayachikitsa",
  "Panchakarma",
  "Shalya Tantra",
  "Shalakya Tantra",
  "Kaumarabhritya",
  "Prasuti-Striroga",
  "Agada Tantra",
  "Rasayana-Vajikarana",
];

const LANGUAGES = ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali"];

export default function OnboardingPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [flow, setFlow] = useState<Flow>("new");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(300);
  const [role, setRole] = useState<"patient" | "doctor" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Common intake
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");

  // Patient detailed intake
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [abhaNumber, setAbhaNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [conditionsText, setConditionsText] = useState("");
  const [medsText, setMedsText] = useState("");

  // Doctor detailed intake
  const [hprNumber, setHprNumber] = useState("");
  const [selectedQuals, setSelectedQuals] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [consultationFee, setConsultationFee] = useState("");

  // Doctor File uploads
  const [degreeFile, setDegreeFile] = useState<File | null>(null);
  const [registrationCertFile, setRegistrationCertFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const STEPS_NEW: Step[] = ["welcome", "phone", "otp", "role", "abha", "patient-intake"];
  const STEPS_RETURNING: Step[] = ["welcome", "phone", "otp"];
  const stepsOrder = flow === "returning" ? STEPS_RETURNING : STEPS_NEW;
  const progressPct = step === "welcome" ? 0 : (stepsOrder.indexOf(step) / (stepsOrder.length - 1)) * 100;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  function startResendTimer() {
    let t = 300;
    setResendTimer(t);
    const interval = setInterval(() => {
      t--;
      setResendTimer(t);
      if (t <= 0) clearInterval(interval);
    }, 1000);
  }

  async function handleSendOTP() {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

      if (flow === "returning" && !existingUser) {
        throw new Error("No account found with this email. Please sign up instead.");
      }
      if (flow === "new" && existingUser) {
        throw new Error("An account with this email already exists. Please sign in.");
      }

      await sendOtp(email);
      startResendTimer();
      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, val: string) {
    const numericVal = val.replace(/\D/g, ""); // Allow only digits
    if (!numericVal) {
      const next = [...otp];
      next[index] = "";
      setOtp(next);
      return;
    }
    const next = [...otp];
    next[index] = numericVal.slice(-1);
    setOtp(next);
    if (index < 5) {
      (document.getElementById(`otp-${index + 1}`) as HTMLInputElement)?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const next = [...otp];
      if (otp[index]) {
        next[index] = "";
        setOtp(next);
      } else if (index > 0) {
        next[index - 1] = "";
        setOtp(next);
        (document.getElementById(`otp-${index - 1}`) as HTMLInputElement)?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      (document.getElementById(`otp-${index - 1}`) as HTMLInputElement)?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      (document.getElementById(`otp-${index + 1}`) as HTMLInputElement)?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) return; // Only allow 6-digit numeric codes

    const next = pastedData.split("");
    setOtp(next);
    
    // Focus the last input
    (document.getElementById("otp-5") as HTMLInputElement)?.focus();
  }

  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        (document.getElementById("otp-0") as HTMLInputElement)?.focus();
      }, 50);
    }
  }, [step]);

  async function handleVerifyOTP() {
    const otpString = otp.join("");
    if (otpString.length < 6) return;
    setLoading(true);
    setError("");

    try {
      await verifyOtp(email, otpString);

      if (flow === "returning") {
        const supabase = createClient();
        const { data: dbUser, error: userError } = await supabase
          .from("users")
          .select("id, email, mobile, role")
          .eq("email", email)
          .single();

        if (userError || !dbUser) throw new Error("Could not load user data.");

        let name = "Verified User";
        if (dbUser.role === "doctor" || dbUser.role === "practitioner") {
          const { data: legacyDoc } = await supabase
            .from("practitioners")
            .select("full_name")
            .eq("user_id", dbUser.id)
            .maybeSingle();
          if (legacyDoc) {
            name = legacyDoc.full_name;
          } else {
            const { data: doc } = await supabase
              .from("doctor_profiles")
              .select("full_name")
              .eq("user_id", dbUser.id)
              .maybeSingle();
            if (doc) name = doc.full_name;
          }
        } else if (dbUser.role === "patient") {
          const { data: legacyPat } = await supabase
            .from("patients")
            .select("full_name")
            .eq("user_id", dbUser.id)
            .maybeSingle();
          if (legacyPat) {
            name = legacyPat.full_name;
          } else {
            const { data: pat } = await supabase
              .from("patient_profiles")
              .select("full_name")
              .eq("user_id", dbUser.id)
              .maybeSingle();
            if (pat) name = pat.full_name;
          }
        }

        login({
          id: dbUser.id,
          phone: dbUser.mobile || "",
          role: dbUser.role as any,
          name,
          abhaLinked: true,
          email: dbUser.email,
        });
        router.push(dbUser.role === "doctor" || dbUser.role === "practitioner" ? "/pro" : "/discover");
      } else {
        setStep("role");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function finishPatient() {
    if (abhaNumber && !/^\d{14}$/.test(abhaNumber.replace(/[-\s]/g, ""))) {
      setError("ABHA ID must be exactly 14 digits");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Always create a fresh client — this one carries the post-OTP session
      // which is required for RLS policies that check auth.uid()
      const supabase = createClient();

      // --- Resolve userId ---
      // 1. Prefer the Supabase Auth session (set after OTP verification)
      const { data: authData } = await supabase.auth.getUser();
      let userId = authData.user?.id ?? "";

      if (!userId) {
        // 2. Fall back: look up by email in the custom users table
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingUser?.id) {
          userId = existingUser.id;
        } else {
          // 3. Last resort: upsert to avoid duplicate-key on retry
          const { data: upsertedUser, error: upsertErr } = await supabase
            .from("users")
            .upsert(
              [{ email, role: "patient" }],
              { onConflict: "email", ignoreDuplicates: false }
            )
            .select("id")
            .single();
          if (upsertErr) throw upsertErr;
          userId = upsertedUser?.id ?? "";
        }
      }

      if (!userId) {
        throw new Error("Unable to establish patient user account.");
      }

      // Pass the authenticated supabase instance so savePatientProfile
      // runs under the user's session and satisfies the RLS policy on
      // patient_profiles (auth.uid() = user_id)
      await savePatientProfile(
        {
          userId,
          fullName,
          dateOfBirth: dob,
          gender,
          phone: phone || "",
          email,
          address,
          abhaNumber: abhaNumber.replace(/[-\s]/g, ""),
          emergencyContactName,
          emergencyContactPhone,
          allergies: allergiesText
            ? allergiesText.split(",").map((x) => x.trim()).filter(Boolean)
            : [],
          chronicConditions: conditionsText
            ? conditionsText.split(",").map((x) => x.trim()).filter(Boolean)
            : [],
          currentMedications: medsText
            ? medsText.split(",").map((x) => x.trim()).filter(Boolean)
            : [],
        },
        supabase  // ← authenticated client
      );

      login({ id: userId, phone: phone || "", role: "patient", name: fullName, abhaLinked: !!abhaNumber, email });
      toast.success("Account created successfully!");
      router.push("/discover");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create patient account.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadStorageFile(bucket: string, path: string, file: File): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw error;
    return `${bucket}/${data.path}`;
  }

  async function finishDoctor() {
    if (!degreeFile || !registrationCertFile) {
      setError("Please upload both Degree and Registration Certificates.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      let userId = authData.user?.id;

      if (!userId) {
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert([{ email, role: "practitioner" }])
          .select()
          .single();
        if (userError) throw userError;
        userId = newUser.id;
      }

      if (!userId) {
        throw new Error("Unable to establish doctor user account.");
      }

      // Upload files securely
      const degreeUrl = await uploadStorageFile("doctor-documents", `${userId}/degree_${Date.now()}_${degreeFile.name}`, degreeFile);
      const registrationCertUrl = await uploadStorageFile("doctor-documents", `${userId}/reg_${Date.now()}_${registrationCertFile.name}`, registrationCertFile);

      let photoUrl = "";
      if (photoFile) {
        photoUrl = await uploadStorageFile("doctor-documents", `${userId}/photo_${Date.now()}_${photoFile.name}`, photoFile);
      }

      let signatureUrl = "";
      if (signatureFile) {
        signatureUrl = await uploadStorageFile("doctor-documents", `${userId}/sig_${Date.now()}_${signatureFile.name}`, signatureFile);
      }

      await saveDoctorProfileAndVerification({
        userId,
        fullName,
        photoUrl,
        signatureUrl,
        consultationFee: Math.round(parseFloat(consultationFee) * 100),
        specializations: selectedSpecialty ? [selectedSpecialty] : ["Ayurveda"],
        languages: selectedLanguages,
        degreeUrl,
        registrationCertUrl,
        hprId: hprNumber || undefined,
      });

      setStep("success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit verification request.");
    } finally {
      setLoading(false);
    }
  }

  function toggleLanguage(l: string) {
    setSelectedLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  function toggleQual(q: string) {
    setSelectedQuals((prev) => (prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]));
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-background py-8 px-4">
      <div className="w-full max-w-lg">
        {step !== "welcome" && step !== "success" && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => {
                  if (step === "phone") setStep("welcome");
                  else if (step === "otp") setStep("phone");
                  else if (step === "role") setStep("otp");
                  else if (step === "abha") setStep("role");
                  else if (step === "patient-intake") setStep("abha");
                  else if (step === "doctor-intake") setStep("role");
                  else if (step === "doctor-documents") setStep("doctor-intake");
                }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-herb-green rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Welcome ── */}
        {step === "welcome" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-herb-gradient flex items-center justify-center mb-6 shadow-lg mx-auto">
              <span className="font-display text-white text-3xl font-bold">M</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground tracking-tight leading-tight">
              Reinvent<br />
              <span className="text-herb-green">You.</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-4 leading-relaxed font-medium">
              India&apos;s first AYUSH digital health ecosystem — connecting ancient healing wisdom with verified modern care.
            </p>
            <div className="flex gap-3 justify-center mt-8 flex-wrap">
              {["🌿", "🧘", "☀️", "⚗️", "🔮", "💧"].map((icon, i) => (
                <div key={i} className="w-10 h-10 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center text-lg">
                  {icon}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Ayurveda · Yoga · Naturopathy · Unani · Siddha · Homeopathy</p>
            <div className="flex items-center gap-2 mt-6 justify-center flex-wrap">
              {["ABDM Compliant", "HPR Verified", "FHIR Records"].map((badge) => (
                <span key={badge} className="text-[10px] bg-herb-green/10 text-herb-green font-semibold px-2.5 py-1 rounded-full border border-herb-green/20">
                  ✓ {badge}
                </span>
              ))}
            </div>
            <button
              onClick={() => { setFlow("new"); setStep("phone"); }}
              className="mt-8 w-full py-4 bg-herb-green text-white rounded-2xl text-base font-semibold hover:bg-herb-green/90 transition-all shadow-md active:scale-98"
            >
              Get Started
            </button>
            <button
              onClick={() => { setFlow("returning"); setStep("phone"); }}
              className="mt-3 w-full py-3 border border-border text-sm font-medium rounded-2xl hover:bg-muted transition-colors text-foreground"
            >
              Sign in to existing account
            </button>
          </div>
        )}

        {/* ── Email ── */}
        {step === "phone" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">
              {flow === "returning" ? "Welcome back" : "Enter your email"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {flow === "returning" ? "Enter your registered email address to sign in" : "We'll send a one-time password to verify"}
            </p>
            <div className="flex gap-3 mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="flex-1 px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 focus:ring-2 focus:ring-herb-green/10 bg-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={() => { handleSendOTP(); }}
              disabled={!email || !email.includes("@")}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-semibold transition-all",
                email && email.includes("@")
                  ? "bg-herb-green text-white hover:bg-herb-green/90 shadow-md"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* ── OTP ── */}
        {step === "otp" && (
          <div className="text-center">
            {/* Security Shield Icon Header */}
            <div className="mx-auto w-16 h-16 bg-herb-green/10 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Verify OTP</h2>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              We sent a 6-digit confirmation code to <br/>
              <span className="font-medium text-foreground">{email}</span>
            </p>

            {/* Input boxes with modern styling */}
            <div className="flex gap-2.5 justify-center mb-8">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  className={cn(
                    "w-11 h-14 text-center text-xl font-bold font-mono border rounded-2xl transition-all duration-200 bg-background shadow-sm focus:outline-none focus:ring-4 focus:ring-herb-green/15 focus:scale-105",
                    digit ? "border-herb-green border-2 bg-herb-green/5" : "border-border hover:border-muted-foreground/30 focus:border-herb-green"
                  )}
                />
              ))}
            </div>

            {/* Countdown / Resend UI */}
            <div className="text-sm text-muted-foreground mb-8 flex justify-center items-center gap-1.5">
              {resendTimer > 0 ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-herb-green animate-ping" />
                  <p className="text-xs">Resend code in <span className="font-semibold text-foreground font-mono">{formatTimer(resendTimer)}</span></p>
                </>
              ) : (
                <button
                  onClick={handleSendOTP}
                  className="text-xs text-herb-green font-semibold hover:underline flex items-center gap-1 transition-all"
                >
                  📩 Didn&apos;t receive the code? Resend
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700 mb-6 flex items-start gap-2 text-left">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={otp.join("").length < 6 || loading}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                otp.join("").length === 6 && !loading
                  ? "bg-herb-green text-white hover:bg-herb-green/90 shadow-md hover:shadow-lg active:scale-[0.99]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{flow === "returning" ? "Sign In" : "Verify & Continue"}</span>
              )}
            </button>
          </div>
        )}

        {/* ── Role Selection ── */}
        {step === "role" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">How will you use MeyVeda?</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose your primary role</p>
            <div className="space-y-3 mb-6">
              {[
                { id: "patient" as const, icon: "🏥", title: "Patient / Health Seeker", desc: "Book consultations, manage health records, track wellness" },
                { id: "doctor" as const, icon: "🩺", title: "AYUSH Doctor / Specialist", desc: "Consult patients, write digital EMR prescriptions, build practice" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                    role === r.id ? "border-herb-green bg-herb-green/5 shadow-sm" : "border-border hover:border-herb-green/30 bg-white"
                  )}
                >
                  <span className="text-3xl flex-shrink-0">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                if (role === "doctor") setStep("doctor-intake");
                else setStep("abha");
              }}
              disabled={!role}
              className={cn(
                "w-full py-3.5 rounded-xl text-sm font-semibold transition-all",
                role ? "bg-herb-green text-white hover:bg-herb-green/90 shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── ABHA ID Verification (patient only) ── */}
        {step === "abha" && (
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-herb-green/10 flex items-center justify-center">
                <Shield size={20} className="text-herb-green" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">ABHA Card & ID</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              ABHA (Ayushman Bharat Health Account) enables seamless secure sharing of health records across India.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">ABHA ID (14 digits) - Optional</label>
                <input
                  type="text"
                  maxLength={14}
                  value={abhaNumber}
                  onChange={(e) => setAbhaNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 12345678901234"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white font-mono tracking-widest text-center"
                />
                {abhaNumber && abhaNumber.length !== 14 && (
                  <p className="text-xs text-red-500 mt-1">Must be exactly 14 digits ({abhaNumber.length}/14)</p>
                )}
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => { setAbhaNumber(""); setStep("patient-intake"); }}
                className="flex-1 py-3.5 border border-border text-sm font-semibold rounded-xl hover:bg-muted transition-colors text-foreground"
              >
                Skip / Do Later
              </button>
              <button
                onClick={() => setStep("patient-intake")}
                disabled={abhaNumber.length > 0 && abhaNumber.length !== 14}
                className={cn(
                  "flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all",
                  !(abhaNumber.length > 0 && abhaNumber.length !== 14)
                    ? "bg-herb-green text-white hover:bg-herb-green/90 shadow-md"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Patient Intake Form ── */}
        {step === "patient-intake" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Create Patient Profile</h2>
            <p className="text-sm text-muted-foreground mb-6">Complete your clinical health record profile</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4">
              {/* Personal */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-herb-green uppercase tracking-wider">Personal Information</p>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rohit Kumar"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Date of Birth</label>
                    <input
                      required
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Gender</label>
                    <select
                      required
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-herb-green uppercase tracking-wider">Emergency Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Details */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-herb-green uppercase tracking-wider">Clinical details</p>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Allergies (comma-separated)</label>
                  <input
                    type="text"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    placeholder="e.g. Peanuts, Penicillin, Dust"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Chronic Conditions (comma-separated)</label>
                  <input
                    type="text"
                    value={conditionsText}
                    onChange={(e) => setConditionsText(e.target.value)}
                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Current Medications (comma-separated)</label>
                  <input
                    type="text"
                    value={medsText}
                    onChange={(e) => setMedsText(e.target.value)}
                    placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700 mt-4 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={finishPatient}
              disabled={!fullName || !dob || !gender || !phone || loading}
              className={cn(
                "w-full py-3.5 mt-6 bg-herb-green text-white rounded-xl text-sm font-semibold transition-all shadow-md",
                !fullName || !dob || !gender || !phone || loading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-herb-green/90 active:scale-98"
              )}
            >
              {loading ? "Creating Profile..." : "Register Profile ✨"}
            </button>
          </div>
        )}

        {/* ── Doctor Intake Form ── */}
        {step === "doctor-intake" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Doctor Profile Details</h2>
            <p className="text-sm text-muted-foreground mb-6 font-medium">Set up your specialty, languages, and practice fee</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Full Name (with Dr. prefix)</label>
                <input
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">HPR ID (optional)</label>
                  <input
                    type="text"
                    value={hprNumber}
                    onChange={(e) => setHprNumber(e.target.value)}
                    placeholder="e.g. HPR-1234-5678"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Consultation Fee (in INR)</label>
                  <input
                    required
                    type="number"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">AYUSH Qualifications</label>
                <div className="flex flex-wrap gap-1.5">
                  {AYUSH_QUALIFICATIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => toggleQual(q)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                        selectedQuals.includes(q)
                          ? "bg-herb-green text-white border-herb-green"
                          : "border-border text-muted-foreground hover:border-herb-green/40 bg-white"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Primary Specialty</label>
                <select
                  required
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-herb-green/50 bg-white"
                >
                  <option value="">Select Specialty</option>
                  {AYUSH_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Languages Spoken</label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l}
                      onClick={() => toggleLanguage(l)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                        selectedLanguages.includes(l)
                          ? "bg-herb-green text-white border-herb-green"
                          : "border-border text-muted-foreground hover:border-herb-green/40 bg-white"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("doctor-documents")}
              disabled={!fullName || !consultationFee || !selectedSpecialty || selectedLanguages.length === 0}
              className={cn(
                "w-full py-3.5 mt-6 bg-herb-green text-white rounded-xl text-sm font-semibold transition-all shadow-md",
                !fullName || !consultationFee || !selectedSpecialty || selectedLanguages.length === 0
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-herb-green/90 active:scale-98"
              )}
            >
              Continue to Document Uploads
            </button>
          </div>
        )}

        {/* ── Doctor Document Uploads ── */}
        {step === "doctor-documents" && (
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">Upload Credentials</h2>
            <p className="text-sm text-muted-foreground mb-6 font-medium">Verify credentials for medical registration</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4">
              {/* Degree Cert */}
              <div className="border border-dashed border-border rounded-2xl p-4 bg-white hover:border-herb-green/50 transition-all">
                <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                  <Award size={28} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">BAMS / AYUSH Degree Certificate (PDF/Image) *</span>
                  <input
                    required
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setDegreeFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {degreeFile ? (
                    <span className="text-xs text-herb-green font-semibold bg-herb-green/10 px-2 py-0.5 rounded-full">
                      ✓ {degreeFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Click to upload document</span>
                  )}
                </label>
              </div>

              {/* State registration certificate */}
              <div className="border border-dashed border-border rounded-2xl p-4 bg-white hover:border-herb-green/50 transition-all">
                <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                  <FileText size={28} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">State Council Registration Certificate (PDF/Image) *</span>
                  <input
                    required
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setRegistrationCertFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {registrationCertFile ? (
                    <span className="text-xs text-herb-green font-semibold bg-herb-green/10 px-2 py-0.5 rounded-full">
                      ✓ {registrationCertFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Click to upload document</span>
                  )}
                </label>
              </div>

              {/* Profile Photo */}
              <div className="border border-dashed border-border rounded-2xl p-4 bg-white hover:border-herb-green/50 transition-all">
                <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                  <User size={28} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Profile Photo (Image)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {photoFile ? (
                    <span className="text-xs text-herb-green font-semibold bg-herb-green/10 px-2 py-0.5 rounded-full">
                      ✓ {photoFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Click to upload image</span>
                  )}
                </label>
              </div>

              {/* Doctor Signature */}
              <div className="border border-dashed border-border rounded-2xl p-4 bg-white hover:border-herb-green/50 transition-all">
                <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                  <Upload size={28} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Doctor Signature (Image)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  {signatureFile ? (
                    <span className="text-xs text-herb-green font-semibold bg-herb-green/10 px-2 py-0.5 rounded-full">
                      ✓ {signatureFile.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Click to upload image</span>
                  )}
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-red-700 mt-4 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={finishDoctor}
              disabled={!degreeFile || !registrationCertFile || loading}
              className={cn(
                "w-full py-3.5 mt-6 bg-herb-green text-white rounded-xl text-sm font-semibold transition-all shadow-md",
                !degreeFile || !registrationCertFile || loading
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-herb-green/90 active:scale-98"
              )}
            >
              {loading ? "Uploading & Submitting..." : "Submit Profile for Review ✨"}
            </button>
          </div>
        )}

        {/* ── Success screen ── */}
        {step === "success" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-herb-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={36} className="text-herb-green" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">Submitted Successfully!</h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
              Your profile documents have been uploaded securely. Our administrative team will review your qualifications and credentials.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2 mt-4 inline-block border border-amber-100 font-medium">
              We&apos;ll notify you by email once your verification status is updated.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-8 w-full py-3.5 bg-herb-green text-white rounded-xl text-sm font-semibold hover:bg-herb-green/90 shadow-md transition-all"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
