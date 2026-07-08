"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usePatientIntakeDetails } from "@/lib/hooks";
import { useAuth } from "@/contexts/auth-context";
import { saveCompleteConsultation, formatTime } from "@/lib/queries";
import { createClient } from "@/lib/supabase";
import { 
  User, Activity, Syringe, Heart, Fingerprint, Calendar, Phone, 
  MapPin, Stethoscope, Droplets, Thermometer, Weight, Wind, Flame,
  FileText, ArrowUpCircle, Plus, Trash2, FileUp, Save, History, Clock,
  Bold, Italic, Underline, List, ListOrdered
} from "lucide-react";

const SectionCard = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
  <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 mb-8">
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    </div>
    {children}
  </div>
);

export default function PatientIntakeClient() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params.id as string) || "p1";

  const { data: intakeData, loading: isLoading, error } = usePatientIntakeDetails(id);
  const patient = intakeData?.patient;
  const vitalsHistory = intakeData?.vitalsHistory || [];

  const latestVitals = vitalsHistory[0] ?? {
    date: "No record", doctor: "N/A", doctorInitials: "N/A",
    bpSys: 120, bpDia: 80, pulse: 72, temp: 98.6, spo2: 98, rr: 16, weight: 70, height: 170
  };
  // State for editable patient details header card
  const [height, setHeight] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");

  // State for Section 2 - Consultation Details
  const [visitReason, setVisitReason] = useState("");
  const [chiefComplaints, setChiefComplaints] = useState<string[]>([]);
  const [complaintInput, setComplaintInput] = useState("");
  const [presentIllness, setPresentIllness] = useState("");
  const [previousHistory, setPreviousHistory] = useState("");
  const [previousCalls, setPreviousCalls] = useState("");

  // State for Section 3 - Recorded Vitals
  const [vitals, setVitals] = useState({
    bpSys: "",
    bpDia: "",
    pulse: "",
    temp: "",
    spo2: "",
    weight: "",
    bmi: "",
  });

  // State for Section 5 - Prescription
  const [medicines, setMedicines] = useState([
    { id: 1, name: "", form: "Tablet", dose: "", timing: "After Food", timeOfDay: "Morning", duration: "", instructions: "" }
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Section 6 - Upload Reports
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // State for Section 7 & 8
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [showUpcomingCallPicker, setShowUpcomingCallPicker] = useState(false);
  const [upcomingCallDate, setUpcomingCallDate] = useState("");
  const [upcomingCallTime, setUpcomingCallTime] = useState("");

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync vitals.weight with header weight input
  useEffect(() => {
    if (weight !== "") {
      setVitals(v => {
        const bmi = (weight && height) ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1) : "";
        return { ...v, weight: String(weight), bmi };
      });
    }
  }, [weight, height]);

  // Sync vitals weight change back to header weight
  const handleVitalsWeightChange = (val: string) => {
    setVitals(v => {
      const bmi = (val && height) ? (Number(val) / Math.pow(Number(height) / 100, 2)).toFixed(1) : "";
      return { ...v, weight: val, bmi };
    });
    if (val !== "") {
      setWeight(Number(val));
    } else {
      setWeight("");
    }
  };

  // Run once data is loaded to populate values from latest checked record
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (intakeData && !hasInitialized) {
      const pat = intakeData.patient;
      const latestVisit = intakeData.visits?.[0] as any;

      if (pat) {
        setHeight(pat.height || "");
        setWeight(pat.weight || "");
        setBloodGroup(pat.bloodGroup || "O+");
        setAddress(pat.address || "");
      }

      if (latestVisit) {
        setVisitReason(latestVisit.visitReason || "");
        setChiefComplaints(latestVisit.chiefComplaints || []);
        setPresentIllness(latestVisit.soap?.S || "");
        setPreviousHistory(latestVisit.previousHistory || "");
        setPreviousCalls(latestVisit.previousCalls || "");

        const v = (latestVisit.vitals as any) || {};
        setVitals({
          bpSys: v.bpSys || "",
          bpDia: v.bpDia || "",
          pulse: v.pulse || "",
          temp: v.temp || "",
          spo2: v.spo2 || "",
          weight: v.weight || pat?.weight || "",
          bmi: (v.weight && v.height) ? (v.weight / Math.pow(v.height / 100, 2)).toFixed(1) : "",
        });

        if (latestVisit.medications && latestVisit.medications.length > 0) {
          setMedicines(latestVisit.medications.map((m: any, idx: number) => ({
            id: m.id || idx,
            name: m.name || "",
            form: m.form || "Tablet",
            dose: m.dose || "",
            timing: m.timing || "After Food",
            timeOfDay: m.timeOfDay || "Morning",
            duration: m.duration || "",
            instructions: m.instructions || ""
          })));
        }

        setPrescriptionNotes(latestVisit.followUpInstructions || "");
        setFollowUpInstructions(latestVisit.followUpInstructions || "");
        if (editorRef.current) {
          editorRef.current.innerHTML = latestVisit.followUpInstructions || "<ul><li>Continue medicines regularly.</li><li>Take with warm water.</li><li>Follow prescribed diet.</li><li>Return after 15 days.</li></ul>";
        }
      }
      setHasInitialized(true);
    }
  }, [intakeData, hasInitialized]);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { id: Date.now(), name: "", form: "Tablet", dose: "", timing: "After Food", timeOfDay: "Morning", duration: "", instructions: "" }]);
  };

  const handleRemoveMedicine = (id: number) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const handleMedicineChange = (id: number, field: string, value: string) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSaveConsultation = async () => {
    setIsSaving(true);
    try {
      const reportUrls: string[] = [];
      const reportNames: string[] = [];

      const supabaseClient = createClient();
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabaseClient.storage.from('patient-reports').upload(fileName, file);
        if (error) {
          console.error("Error uploading file:", error);
        } else if (data) {
          const { data: { publicUrl } } = supabaseClient.storage.from('patient-reports').getPublicUrl(data.path);
          reportUrls.push(publicUrl);
          reportNames.push(file.name);
        }
      }

      const consultationData = {
        practitionerId: user?.id || "",
        patientId: id,
        visitReason,
        chiefComplaints,
        presentIllness,
        previousHistory,
        previousCalls,
        vitals: {
          ...vitals,
          height,
          weight
        },
        bloodGroup,
        address,
        medicines,
        prescriptionNotes,
        followUpInstructions,
        upcomingCallDate,
        upcomingCallTime,
        reportUrls,
        reportNames
      };

      const result = await saveCompleteConsultation(consultationData);

      if (result.success) {
        setIsSaved(true);
        setTimeout(() => {
          window.location.href = `/pro/prescriptions?patientName=${encodeURIComponent(patient?.name || "")}`;
        }, 1200);
      } else {
        alert("Failed to save consultation: " + result.error);
      }
    } catch (err: any) {
      alert("Failed to save consultation: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const addComplaint = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && complaintInput.trim() !== '') {
      e.preventDefault();
      if (!chiefComplaints.includes(complaintInput.trim())) {
        setChiefComplaints([...chiefComplaints, complaintInput.trim()]);
      }
      setComplaintInput("");
    }
  };

  const removeComplaint = (complaint: string) => {
    setChiefComplaints(chiefComplaints.filter(c => c !== complaint));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-2xl border border-rose-100 shadow-sm max-w-lg mx-auto mt-20">
        <div className="text-rose-500 font-bold text-lg mb-2">Error Loading Patient Data</div>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-lg text-left font-mono mb-4 leading-relaxed">
          Please verify that you have run the database migration script in your Supabase SQL Editor.
          The script is located at: supabase/migrations/20260706000000_add_patient_vitals_columns.sql
        </div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4 flex items-center justify-between mb-10 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <Link href="/pro/patients" className="hover:text-indigo-600 transition-colors">Patients</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900">Consultation: {patient.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
            {patient.name[0]}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Section 1: Patient Details (Read Only) */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-8 mb-8 flex flex-col lg:flex-row gap-8">
          {/* Left Side: Identity Card */}
          <div className="flex flex-col items-center justify-center bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100 lg:w-1/3 min-w-[280px]">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-display font-bold text-4xl shadow-sm mb-4 border-4 border-white">
              {patient.name[0]}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">{patient.name}</h2>
            <p className="text-sm font-mono text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 mb-4 shadow-sm">ID: {id.substring(0,8).toUpperCase()}</p>
            <div className="flex gap-4 text-sm font-medium text-gray-600 bg-white px-6 py-2.5 rounded-xl border border-gray-100 shadow-sm">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-400" /> {patient.age}y</span>
              <div className="w-px h-4 bg-gray-200"></div>
              <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-purple-400" /> {patient.gender}</span>
            </div>
          </div>

          {/* Right Side: Elegant Info Cards with Editable Fields */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Height Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-500">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Height</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <input 
                    type="number" 
                    value={height} 
                    onChange={e => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-16 bg-transparent font-bold text-gray-800 text-[15px] focus:outline-none focus:border-indigo-500 border-b border-transparent focus:ring-0 p-0" 
                    placeholder="—"
                  />
                  <span className="text-[13px] font-semibold text-gray-500">cm</span>
                </div>
              </div>
            </div>

            {/* Weight Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-500">
                <Weight className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Weight</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <input 
                    type="number" 
                    value={weight} 
                    onChange={e => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-16 bg-transparent font-bold text-gray-800 text-[15px] focus:outline-none focus:border-indigo-500 border-b border-transparent focus:ring-0 p-0" 
                    placeholder="—"
                  />
                  <span className="text-[13px] font-semibold text-gray-500">kg</span>
                </div>
              </div>
            </div>

            {/* Blood Group Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Blood Group</p>
                <select 
                  value={bloodGroup} 
                  onChange={e => setBloodGroup(e.target.value)}
                  className="w-full bg-transparent font-bold text-gray-800 text-[15px] focus:outline-none focus:border-indigo-500 border-b border-transparent focus:ring-0 p-0"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Contact Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-500">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Contact</p>
                <p className="text-[15px] font-bold text-gray-800 mt-0.5">{patient.phone || "—"}</p>
              </div>
            </div>

            {/* Prakriti Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-50 text-purple-500">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Prakriti</p>
                <p className="text-[15px] font-bold text-gray-800 mt-0.5">{patient.prakriti || "Vata-Pitta"}</p>
              </div>
            </div>

            {/* Address Card */}
            <div className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-[14px] shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-50 text-orange-500">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Address</p>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-transparent font-bold text-gray-800 text-[15px] focus:outline-none focus:border-indigo-500 border-b border-transparent focus:ring-0 p-0" 
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
        </div>
        <SectionCard title="Consultation Details" icon={Stethoscope}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Reason</label>
              <input 
                type="text"
                placeholder="e.g. Follow up"
                value={visitReason} onChange={e => setVisitReason(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Reasons <span className="text-gray-400 font-normal text-xs ml-1">(Press Enter to add)</span></label>
              <div className="flex flex-wrap gap-2 items-center bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-3 py-2 min-h-[48px] focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all shadow-sm">
                {chiefComplaints.map(c => (
                  <span key={c} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm">
                    {c}
                    <button onClick={() => removeComplaint(c)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={complaintInput} 
                  onChange={e => setComplaintInput(e.target.value)}
                  onKeyDown={addComplaint}
                  className="flex-1 min-w-[150px] outline-none text-sm bg-transparent px-2"
                  placeholder="e.g. Joint pain, Headaches..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Previous History</label>
              <input 
                type="text"
                placeholder="e.g. Hypertension"
                value={previousHistory} onChange={e => setPreviousHistory(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Previous Calls</label>
              <input 
                type="text"
                placeholder="e.g. 12 June 2026"
                value={previousCalls} onChange={e => setPreviousCalls(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">History of Present Illness</label>
            <textarea 
              value={presentIllness} onChange={e => setPresentIllness(e.target.value)}
              rows={4}
              placeholder="Detail the progression of symptoms..."
              className="w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all resize-none shadow-sm"
            />
          </div>
        </SectionCard>

        {/* Section 3: Recorded Vitals */}
        <SectionCard title="Recorded Vitals" icon={Activity}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-6">
            {[
              { label: "Systolic BP", key: "bpSys", suffix: "mmHg", val: vitals.bpSys },
              { label: "Diastolic BP", key: "bpDia", suffix: "mmHg", val: vitals.bpDia },
              { label: "Pulse", key: "pulse", suffix: "bpm", val: vitals.pulse },
              { label: "Temp", key: "temp", suffix: "°F", val: vitals.temp },
              { label: "SpO₂", key: "spo2", suffix: "%", val: vitals.spo2 },
              { label: "Weight", key: "weight", suffix: "kg", val: vitals.weight },
              { label: "BMI", key: "bmi", suffix: "", val: vitals.bmi, readOnly: true },
            ].map(v => (
              <div key={v.key}>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{v.label}</label>
                <div className="relative">
                  <input 
                    type="number"
                    readOnly={v.readOnly}
                    value={v.val}
                    onChange={e => {
                      if (v.key === "weight") {
                        handleVitalsWeightChange(e.target.value);
                      } else {
                        setVitals({...vitals, [v.key]: e.target.value});
                      }
                    }}
                    className={cn(
                      "w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] pl-4 pr-12 py-3 text-sm font-semibold outline-none transition-all focus:border-indigo-400 shadow-sm",
                      v.readOnly ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "focus:ring-2 focus:ring-indigo-100 text-gray-900"
                    )}
                  />
                  {v.suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{v.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
             <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                <History className="w-4 h-4 text-gray-400" />
                <span>Last Recorded: <span className="font-semibold text-gray-700">{latestVitals.date}</span></span>
             </div>
          </div>
        </SectionCard>

        {/* Section 5: Unified Prescription Card */}
        <SectionCard title="Prescription & Notes" icon={Syringe}>
          <div className="bg-white border border-gray-200 rounded-[16px] overflow-hidden shadow-sm mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-wider font-bold">
                    <th className="px-4 py-3 min-w-[200px]">Medicine Name</th>
                    <th className="px-3 py-3 min-w-[120px]">Form</th>
                    <th className="px-3 py-3 min-w-[100px]">Dose</th>
                    <th className="px-3 py-3 min-w-[130px]">Time of Day</th>
                    <th className="px-3 py-3 min-w-[140px]">Timing</th>
                    <th className="px-3 py-3 min-w-[100px]">Duration</th>
                    <th className="px-4 py-3 min-w-[200px]">Instructions</th>
                    <th className="px-4 py-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-[#F8FAFC]">
                  {medicines.map((med) => (
                    <tr key={med.id} className="group hover:bg-white transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="text" placeholder="Search medicine..." value={med.name} onChange={e => handleMedicineChange(med.id, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <select 
                          value={med.form} onChange={e => handleMedicineChange(med.id, 'form', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        >
                          <option>Tablet</option><option>Churna</option><option>Kashayam</option><option>Taila</option><option>Capsule</option><option>Syrup</option><option>Others</option>
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text" placeholder="e.g. 10ml" value={med.dose} onChange={e => handleMedicineChange(med.id, 'dose', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <select 
                          value={med.timeOfDay} onChange={e => handleMedicineChange(med.id, 'timeOfDay', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        >
                          <option>Morning</option><option>Afternoon</option><option>Evening</option><option>Night</option>
                        </select>
                      </td>

                      <td className="px-2 py-3">
                        <select 
                          value={med.timing} onChange={e => handleMedicineChange(med.id, 'timing', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        >
                          <option>Before Food</option><option>After Food</option><option>Empty Stomach</option>
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input 
                          type="text" placeholder="15 Days" value={med.duration} onChange={e => handleMedicineChange(med.id, 'duration', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" placeholder="With warm water" value={med.instructions} onChange={e => handleMedicineChange(med.id, 'instructions', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none shadow-sm transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveMedicine(med.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white border-t border-gray-200 px-4 py-4 flex items-center justify-between">
              <button onClick={handleAddMedicine} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100">
                <Plus className="w-4 h-4" /> Add Medicine
              </button>
            </div>
          </div>

          {/* Unified Prescription Notes Area inside the same card */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400"/> Additional Instructions & Notes</label>
            <div className="border border-gray-200 rounded-[16px] overflow-hidden bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all shadow-sm">
              <div className="bg-[#F8FAFC] border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                <button type="button" onClick={() => handleFormat('bold')} className="p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-[8px] hover:shadow-sm w-8 h-8 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleFormat('italic')} className="p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-[8px] hover:shadow-sm w-8 h-8 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleFormat('underline')} className="p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-[8px] hover:shadow-sm w-8 h-8 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all"><Underline className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <button type="button" onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-[8px] hover:shadow-sm w-8 h-8 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => handleFormat('insertOrderedList')} className="p-1.5 text-gray-600 hover:bg-white hover:text-gray-900 rounded-[8px] hover:shadow-sm w-8 h-8 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all"><ListOrdered className="w-4 h-4" /></button>
              </div>
              <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setPrescriptionNotes(e.currentTarget.innerHTML)}
                className="w-full px-6 py-5 text-sm outline-none resize-none leading-relaxed text-gray-700 min-h-[150px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
              >
                <ul>
                  <li>Continue medicines regularly.</li>
                  <li>Take with warm water.</li>
                  <li>Follow prescribed diet.</li>
                  <li>Return after 15 days.</li>
                </ul>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 6: Upload Reports */}
        <SectionCard title="Upload Reports" icon={FileUp}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/80 hover:border-indigo-300 transition-all rounded-[16px] p-10 flex flex-col items-center justify-center text-center cursor-pointer group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              multiple 
              accept=".pdf,.jpg,.jpeg,.png" 
            />
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-indigo-100 mb-4 group-hover:-translate-y-1 transition-transform">
              <FileUp className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-base font-semibold text-indigo-900 mb-1">Click to upload or drag and drop</p>
            <p className="text-sm text-indigo-400 mb-5 font-medium">PDF, JPG, PNG (Max 5MB)</p>
            <button type="button" className="bg-white border border-gray-200 shadow-sm text-gray-700 text-sm font-bold px-6 py-2.5 rounded-[12px] hover:border-gray-300 hover:bg-gray-50 transition-all pointer-events-none">
              Browse Files
            </button>
          </div>

          {/* List of files to be uploaded */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Files to Upload:</p>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <span className="text-xs text-indigo-700 font-semibold">{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }} className="text-rose-500 hover:text-rose-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Previously Uploaded Reports */}
          {(intakeData?.visits?.[0] as any)?.attachments && (intakeData.visits[0] as any).attachments.length > 0 && (
            <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Previously Uploaded Reports:</p>
              {(intakeData.visits[0] as any).attachments.map((file: any) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-xs text-gray-700 font-semibold">{file.file_name}</span>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
                    View File
                  </a>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Section 7: Follow-up & Notes */}
        <SectionCard title="Follow-up & Notes" icon={Clock}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Instructions</label>
            <input 
              type="text" 
              placeholder="e.g. Return after 15 days, empty stomach"
              value={followUpInstructions} onChange={e => setFollowUpInstructions(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-gray-200 rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="mt-6 border-t border-gray-100 pt-6">
            <button 
              onClick={() => setShowUpcomingCallPicker(!showUpcomingCallPicker)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {showUpcomingCallPicker ? "Hide Upcoming Calls" : "Upcoming Calls"}
            </button>
            
            {showUpcomingCallPicker && (
              <div className="mt-4 p-5 bg-[#F8FAFC] border border-gray-200 rounded-[16px] shadow-sm animate-in fade-in slide-in-from-top-2">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Patient Availability & Slot Booking</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Date</label>
                    <input 
                      type="date" 
                      value={upcomingCallDate}
                      onChange={e => setUpcomingCallDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Time</label>
                    <input 
                      type="time" 
                      value={upcomingCallTime}
                      onChange={e => setUpcomingCallTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-[10px] px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                {(upcomingCallDate && upcomingCallTime) && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Slot booked on spot for {upcomingCallDate} at {formatTime(upcomingCallTime)}
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Final Section: Save Consultation (Bottom scrolling position, not sticky) */}
        <div className="flex justify-end gap-3 pt-4 pb-12">
          <button className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm px-5 py-2.5 rounded-xl border border-gray-200 shadow-sm transition-all min-w-[120px]">
            Save Draft
          </button>
          
          {!isSaved ? (
            <button 
              onClick={handleSaveConsultation}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-[0_4px_12px_rgb(79,70,229,0.25)] hover:shadow-[0_6px_16px_rgb(79,70,229,0.35)] hover:-translate-y-0.5 transition-all min-w-[180px]"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Consultation"}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Saved Successfully
              </span>
              <button 
                onClick={() => router.push(`/pro/prescriptions?patientName=${encodeURIComponent(patient?.name || "")}`)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-[0_4px_12px_rgb(16,185,129,0.25)] hover:shadow-[0_6px_16px_rgb(16,185,129,0.35)] hover:-translate-y-0.5 transition-all min-w-[180px]"
              >
                <FileText className="w-4 h-4" />
                View Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
