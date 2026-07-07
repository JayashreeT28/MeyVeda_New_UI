// MeyVeda shared type definitions
export interface Practitioner {
  id: string;
  name: string;
  specialty: string;
  discipline: AYUSHDiscipline;
  experience: number;
  rating: number;
  reviews: number;
  fee: number;
  hprId: string;
  isVerified: boolean;
  avatar: string;
  languages: string[];
  consultModes: ("video" | "clinic")[];
  nextAvailable: string;
  location: string;
  qualifications: string[];
  about: string;
  clinicFee?: number;
  slotDuration?: number;
  bufferMin?: number;
}

export interface Appointment {
  id: string;
  doctor: Practitioner;
  date: string;
  time: string;
  mode: "video" | "clinic";
  status: "upcoming" | "completed" | "cancelled";
  patientName: string;
}

export interface DinacharTask {
  id: string;
  time: string;
  title: string;
  description: string;
  done: boolean;
  category: "diet" | "exercise" | "mindfulness" | "medicine";
}

export interface HealthRecord {
  id: string;
  date: string;
  type: "consultation" | "prescription" | "lab" | "tracker";
  title: string;
  doctor?: string;
  discipline?: AYUSHDiscipline;
  summary: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

export type AYUSHDiscipline =
  | "Ayurveda"
  | "Yoga"
  | "Naturopathy"
  | "Unani"
  | "Siddha"
  | "Homeopathy";

export type QueueStatus = "waiting" | "checked-in" | "in-session" | "completed";

export type QueuePatient = {
  id: string;
  appointmentId: string;
  name: string;
  age: number;
  time: string;
  mode: "video" | "clinic";
  status: QueueStatus;
  waitMins: number;
  reason: string;
  abha: string | null;
};

export type IntakeTab = "intake" | "vitals" | "medical-history" | "history" | "care-team" | "reports";

export type VitalsRecord = {
  date: string; doctor: string; doctorInitials: string; isYou?: boolean;
  bpSys: number; bpDia: number; pulse: number; temp: number;
  spo2: number; rr: number; weight: number; height: number;
};

export type VisitRecord = {
  id: string;
  date: string; time: string; duration: string;
  mode: "video" | "clinic";
  doctor: string; specialty: string; doctorInitials: string; isYou?: boolean;
  chiefComplaint: string;
  soap: { S: string; O: string; A: string; P: string };
  diagnosis: string;
  vitals: { bpSys: number; bpDia: number; pulse: number; temp: number; spo2: number; rr: number; weight: number; height: number } | null;
  medications: { name: string; dose: string; frequency: string; anupana: string; system: string }[];
  investigations: string[];
  referrals: { specialty: string; urgency: string }[];
  followUpDate: string | null;
  followUpInstructions: string;
  type: "initial" | "follow-up" | "review" | "urgent";
};

export interface SocialHistory {
  occupation: string;
  marital: string;
  tobacco: string;
  alcohol: string;
  diet: string;
  exercise: string;
  notes?: string;
}

export interface MedicalHistory {
  allergies: any[];
  medications: any[];
  pmh: any[];
  surgeries: any[];
  family: any[];
  social: SocialHistory;
  immunizations: any[];
}
