import { createClient } from "./supabase";
import type { Practitioner, DinacharTask, HealthRecord, QueuePatient, QueueStatus, VisitRecord, VitalsRecord, MedicalHistory } from "./types";

const supabase = createClient();

async function resolvePatientId(id: string): Promise<string> {
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", id)
    .maybeSingle();
  return data?.id ?? id;
}

async function resolvePractitionerId(id: string): Promise<string> {
  const { data } = await supabase
    .from("practitioners")
    .select("id")
    .eq("user_id", id)
    .maybeSingle();
  return data?.id ?? id;
}

// ---------------------------------------------------------------------------
// Practitioners  (maps DB `practitioners` → frontend `Practitioner` shape)
// ---------------------------------------------------------------------------

export async function getDiscoverMetadata(): Promise<{
  symptoms: string[];
  disciplineCounts: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from("practitioners")
    .select("disciplines, specializations")
    .eq("verification_status", "verified");

  if (error || !data) {
    return { symptoms: [], disciplineCounts: {} };
  }

  const symptomsSet = new Set<string>();
  const counts: Record<string, number> = {};

  for (const row of data) {
    for (const spec of (row.specializations || [])) {
      symptomsSet.add(spec);
    }
    for (const disc of (row.disciplines || [])) {
      counts[disc] = (counts[disc] || 0) + 1;
    }
  }

  return {
    symptoms: Array.from(symptomsSet).slice(0, 30),
    disciplineCounts: counts,
  };
}

export async function getPractitioners(filters?: {
  discipline?: string;
  search?: string;
  videoAvailable?: boolean;
  under500?: boolean;
  today?: boolean;
  languages?: string[];
  sortBy?: string;
}): Promise<Practitioner[]> {
  let query = supabase
    .from("practitioners")
    .select("*")
    .eq("verification_status", "verified");

  if (filters?.discipline) {
    query = query.contains("disciplines", [filters.discipline]);
  }

  if (filters?.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `full_name.ilike.${s},specializations.cs.{${filters.search}}`
    );
  }

  if (filters?.videoAvailable) {
    query = query.gt("base_video_fee", 0);
  }

  if (filters?.under500) {
    // 500 INR in paise is 50000 paise
    query = query.lt("base_video_fee", 50000);
  }

  if (filters?.languages && filters.languages.length > 0) {
    query = query.contains("languages", filters.languages);
  }

  if (filters?.today) {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: slotsData, error: slotsError } = await supabase
      .from("slots")
      .select("practitioner_id")
      .eq("slot_date", todayStr)
      .eq("status", "open");

    if (!slotsError && slotsData) {
      const practitionerIds = Array.from(new Set(slotsData.map((s: any) => s.practitioner_id).filter(Boolean)));
      if (practitionerIds.length > 0) {
        query = query.in("id", practitionerIds);
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  if (filters?.sortBy === "rating") {
    query = query.order("rating_avg", { ascending: false });
  } else if (filters?.sortBy === "fee-low-high") {
    query = query.order("base_video_fee", { ascending: true });
  } else if (filters?.sortBy === "experience") {
    query = query.order("experience_years", { ascending: false });
  } else {
    query = query.order("rating_avg", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error("getPractitioners error:", error);
    return [];
  }

  return (data ?? []).map(mapPractitioner);
}

export async function getPractitionerById(
  idInput: string
): Promise<Practitioner | null> {
  const resolvedId = await resolvePractitionerId(idInput);
  const { data, error } = await supabase
    .from("practitioners")
    .select("*")
    .eq("id", resolvedId)
    .single();

  if (error || !data) return null;
  return mapPractitioner(data);
}

/** Map a raw DB practitioner row to the frontend Practitioner type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPractitioner(row: any): Practitioner {
  return {
    id: row.id,
    name: row.full_name,
    specialty: (row.specializations ?? [])[0] ?? "",
    discipline: (row.disciplines ?? [])[0] ?? "Ayurveda",
    experience: row.experience_years ?? 0,
    rating: Number(row.rating_avg ?? 0),
    reviews: row.rating_count ?? 0,
    fee: Math.round((row.base_video_fee ?? 0) / 100), // paise → rupees
    hprId: row.hpr_id ?? "",
    isVerified: row.hpr_verified ?? false,
    avatar: getInitials(row.full_name),
    languages: row.languages ?? [],
    consultModes: row.base_clinic_fee
      ? (["video", "clinic"] as ("video" | "clinic")[])
      : (["video"] as ("video" | "clinic")[]),
    nextAvailable: "Tomorrow",
    location: "",
    qualifications: row.qualifications ?? [],
    about: row.bio ?? "",
    clinicFee: Math.round((row.base_clinic_fee ?? 0) / 100),
    slotDuration: row.slot_duration_min ?? 20,
    bufferMin: row.buffer_min ?? 5,
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Dinacharya Tasks  (maps DB `dinacharya_tasks` → frontend `DinacharTask`)
// ---------------------------------------------------------------------------

export async function getDinacharyaTasks(
  patientIdInput: string
): Promise<DinacharTask[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const today = new Date().toISOString().split("T")[0];

  // 1. Get active plan(s) for the patient
  const { data: plans, error: planError } = await supabase
    .from("dinacharya_plans")
    .select("id")
    .eq("patient_id", resolvedPatientId)
    .eq("is_active", true);

  if (planError || !plans || plans.length === 0) {
    if (planError) console.error("getDinacharyaTasks plan error:", planError);
    return [];
  }

  const planIds = plans.map((p) => p.id);

  // 2. Fetch all tasks for these plans
  const { data: tasks, error: tasksError } = await supabase
    .from("dinacharya_tasks")
    .select("*")
    .in("plan_id", planIds)
    .order("time_of_day", { ascending: true });

  if (tasksError || !tasks) {
    console.error("getDinacharyaTasks tasks error:", tasksError);
    return [];
  }

  // 3. Fetch habit logs for today
  const { data: logs, error: logsError } = await supabase
    .from("habit_logs")
    .select("task_id, is_done")
    .eq("patient_id", resolvedPatientId)
    .eq("log_date", today);

  if (logsError) {
    console.error("getDinacharyaTasks logs error:", logsError);
  }

  const doneTaskIds = new Set(
    (logs ?? [])
      .filter((l) => l.is_done)
      .map((l) => l.task_id)
  );

  return tasks.map((task: any) => ({
    id: task.id,
    time: task.time_of_day ? formatTime(task.time_of_day) : "",
    title: task.title ?? "",
    description: task.description ?? "",
    done: doneTaskIds.has(task.id),
    category: (task.category as "diet" | "exercise" | "mindfulness" | "medicine") ?? "mindfulness",
  }));
}

function formatTime(timeStr: string): string {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12.toString().padStart(2, "0")}:${m} ${period}`;
}

// ---------------------------------------------------------------------------
// Health Records  (maps DB `health_records` → frontend `HealthRecord`)
// ---------------------------------------------------------------------------

export async function getHealthRecords(
  patientIdInput: string
): Promise<HealthRecord[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("health_records")
    .select("*, practitioners(full_name)")
    .eq("patient_id", resolvedPatientId)
    .order("record_date", { ascending: false });

  if (error) {
    console.error("getHealthRecords error:", error);
    return [];
  }

  return (data ?? []).map(mapHealthRecord);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHealthRecord(row: any): HealthRecord {
  return {
    id: row.id,
    date: row.record_date ?? "",
    type: row.record_type ?? "consultation",
    title: row.title ?? "",
    doctor: row.practitioners?.full_name ?? row.source_facility ?? "",
    discipline: row.discipline,
    summary: row.summary ?? "",
  };
}

// ---------------------------------------------------------------------------
// Orders  (maps DB `apothecary_orders` + `order_items` → frontend Order type)
// ---------------------------------------------------------------------------

export type OrderItem = {
  name: string;
  brand: string;
  weight: string;
  price: number;
  icon: string;
};

export type Order = {
  id: string;
  number: string;
  date: string;
  status: string;
  items: OrderItem[];
  total: number;
  tracking?: string;
  eta?: string;
  autoRefill: boolean;
};

export async function getOrders(patientIdInput: string): Promise<Order[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("patient_id", resolvedPatientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getOrders error:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    number: row.id.slice(0, 8),
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : "",
    status: row.status ?? "placed",
    tracking: row.tracking_number,
    eta: row.estimated_delivery
      ? new Date(row.estimated_delivery).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      : undefined,
    autoRefill: row.refill_order ?? false,
    total: Math.round((row.total_paise ?? 0) / 100),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (row.order_items ?? []).map((item: any) => ({
      name: item.medicine_name ?? "",
      brand: "MeyVeda Apothecary",
      weight: `${item.quantity} Qty`,
      price: Math.round((item.unit_price_paise ?? 0) / 100),
      icon: "🌿",
    })),
  }));
}

// ---------------------------------------------------------------------------
// Toggle Dinacharya task completion
// ---------------------------------------------------------------------------

export async function toggleDinacharyaTask(
  taskId: string,
  done: boolean
): Promise<void> {
  // 1. Find patient ID associated with the task
  const { data: task, error: taskErr } = await supabase
    .from("dinacharya_tasks")
    .select("plan_id, dinacharya_plans(patient_id)")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    console.error("toggleDinacharyaTask error fetching task:", taskErr);
    return;
  }

  const patientId = (task as any).dinacharya_plans?.patient_id;
  if (!patientId) {
    console.error("toggleDinacharyaTask error: patient_id not found for task", taskId);
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  if (done) {
    const { error: insertErr } = await supabase
      .from("habit_logs")
      .upsert({
        task_id: taskId,
        patient_id: patientId,
        log_date: today,
        is_done: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: "task_id,patient_id,log_date"
      });
    if (insertErr) console.error("toggleDinacharyaTask error logging habit:", insertErr);
  } else {
    const { error: deleteErr } = await supabase
      .from("habit_logs")
      .delete()
      .eq("task_id", taskId)
      .eq("patient_id", patientId)
      .eq("log_date", today);
    if (deleteErr) console.error("toggleDinacharyaTask error deleting habit log:", deleteErr);
  }
}

// ---------------------------------------------------------------------------
// Patient Registry Operations (POST, GET, UPDATE, DELETE)
// ---------------------------------------------------------------------------

export async function getRegistryPatients(practitionerUserId?: string): Promise<any[]> {
  let patientIdsFilter: string[] | null = null;
  const today = new Date().toLocaleDateString("en-CA");
  const appointmentsByPatient: Record<string, any[]> = {};
  const patientsWithAppointmentToday = new Set<string>();

  if (practitionerUserId) {
    const resolvedPractitionerId = await resolvePractitionerId(practitionerUserId);

    const { data: appointments } = await supabase
      .from("appointments")
      .select("patient_id, scheduled_date, scheduled_time")
      .eq("practitioner_id", resolvedPractitionerId);

    const ids = (appointments ?? [])
      .map((a: any) => {
        if (a.patient_id) {
          if (!appointmentsByPatient[a.patient_id]) {
            appointmentsByPatient[a.patient_id] = [];
          }
          appointmentsByPatient[a.patient_id].push(a);
          if (a.scheduled_date === today) {
            patientsWithAppointmentToday.add(a.patient_id);
          }
        }
        return a.patient_id;
      })
      .filter(Boolean) as string[];

    const { data: newDoc } = await supabase
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", practitionerUserId)
      .maybeSingle();

    if (newDoc) {
      const { data: newAppointments } = await supabase
        .from("appointments")
        .select("patient_id, scheduled_date, scheduled_time")
        .eq("doctor_profile_id", newDoc.id);

      (newAppointments ?? []).forEach((a: any) => {
        if (a.patient_id) {
          ids.push(a.patient_id);
          if (!appointmentsByPatient[a.patient_id]) {
            appointmentsByPatient[a.patient_id] = [];
          }
          appointmentsByPatient[a.patient_id].push(a);
          if (a.scheduled_date === today) {
            patientsWithAppointmentToday.add(a.patient_id);
          }
        }
      });
    }

    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return [];
    }
    patientIdsFilter = uniqueIds;
  }

  let legacyQuery = supabase.from("patients").select(`
      id,
      full_name,
      date_of_birth,
      gender,
      prakriti,
      user:users (
        mobile,
        abha_links ( abha_id )
      )
    `);
  let profileQuery = supabase.from("patient_profiles").select(`
      id,
      user_id,
      full_name,
      date_of_birth,
      gender,
      phone,
      abha_number
    `);

  if (patientIdsFilter) {
    legacyQuery = legacyQuery.in("id", patientIdsFilter);
    profileQuery = profileQuery.in("user_id", patientIdsFilter);
  }

  const [ { data: legacyPatients, error: patError }, { data: newProfiles, error: profError } ] = await Promise.all([
    legacyQuery,
    profileQuery
  ]);

  if (patError || profError) {
    console.error("getRegistryPatients error:", patError || profError);
    return [];
  }

  // Merge the two sources. Prefer legacy if both exist (unlikely), or just use whatever is available.
  const mergedPatientsMap = new Map<string, any>();
  
  for (const p of (legacyPatients || [])) {
    mergedPatientsMap.set(p.id, p);
  }
  
  for (const p of (newProfiles || [])) {
    // If they were already added from legacy, skip or merge (we just skip to favor legacy for now)
    if (!mergedPatientsMap.has(p.user_id)) {
      mergedPatientsMap.set(p.user_id, {
        id: p.user_id, // We use user_id here because appointments stores it as patient_id
        full_name: p.full_name,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        prakriti: "Vata-Pitta", // default for new profiles
        user: { mobile: p.phone, abha_links: p.abha_number ? [{ abha_id: p.abha_number }] : [] }
      });
    }
  }

  const patients = Array.from(mergedPatientsMap.values());

  let followUps: any[] = [];
  if (practitionerUserId) {
    const resolvedPractitionerId = await resolvePractitionerId(practitionerUserId);
    const { data: fuData } = await supabase
      .from("follow_ups")
      .select("patient_id, recommended_date, booked_appointment_id")
      .eq("practitioner_id", resolvedPractitionerId);
    followUps = fuData ?? [];
  }

  const followUpsByPatient: Record<string, any[]> = {};
  for (const f of followUps) {
    if (!followUpsByPatient[f.patient_id]) {
      followUpsByPatient[f.patient_id] = [];
    }
    followUpsByPatient[f.patient_id].push(f);
  }

  // Fetch all health records to find vitals, problems, and notes
  const { data: records, error: recError } = await supabase
    .from("health_records")
    .select("*")
    .order("record_date", { ascending: false });

  if (recError) {
    console.error("getRegistryPatients records error:", recError);
  }

  const recordsByPatient: Record<string, any[]> = {};
  for (const r of records ?? []) {
    if (!recordsByPatient[r.patient_id]) {
      recordsByPatient[r.patient_id] = [];
    }
    recordsByPatient[r.patient_id].push(r);
  }

  return patients.map((p: any) => {
    let age = 0;
    if (p.date_of_birth) {
      const birthDate = new Date(p.date_of_birth);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    const patientRecords = recordsByPatient[p.id] ?? [];

    // Latest vitals
    const vitalsRecord = patientRecords.find(r => r.title === "Vitals" && r.record_type === "tracker");
    let vitals = null;
    if (vitalsRecord && vitalsRecord.summary) {
      try {
        vitals = JSON.parse(vitalsRecord.summary);
      } catch (e) { }
    }

    // Problems
    const problemsRecord = patientRecords.find(r => r.title === "Problems" && r.record_type === "tracker");
    let problems: any[] = [];
    if (problemsRecord && problemsRecord.summary) {
      try {
        problems = JSON.parse(problemsRecord.summary);
      } catch (e) { }
    }

    // Latest visit date & count
    const visits = patientRecords.filter(r => r.record_type === "consultation");
    const lastVisit = visits[0]?.record_date ?? "No visits";
    let lastVisitDaysAgo = 99;
    if (visits[0]?.record_date) {
      const diffTime = Math.abs(new Date().getTime() - new Date(visits[0].record_date).getTime());
      lastVisitDaysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const userObj = Array.isArray(p.user) ? p.user[0] : p.user;
    const abhaList = userObj?.abha_links || [];
    const abha = abhaList.length > 0 ? abhaList[0].abha_id : null;

    const patientAppts = appointmentsByPatient[p.id] ?? [];
    const isToday = patientAppts.some(a => a.scheduled_date === today);

    // Calculate next appointment or follow-up recommendation
    const futureAppts = patientAppts.filter(a => a.scheduled_date >= today);
    futureAppts.sort((a, b) => {
      const dA = new Date(`${a.scheduled_date}T${a.scheduled_time || '00:00:00'}`).getTime();
      const dB = new Date(`${b.scheduled_date}T${b.scheduled_time || '00:00:00'}`).getTime();
      return dA - dB;
    });

    let nextFollowUp = null;
    if (futureAppts.length > 0) {
      nextFollowUp = new Date(futureAppts[0].scheduled_date).toLocaleDateString("en-IN", {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    const patientFollowUps = (followUpsByPatient[p.id] ?? []).filter(f => !f.booked_appointment_id);
    let followUpDue = false;
    if (patientFollowUps.length > 0) {
      patientFollowUps.sort((a, b) => new Date(a.recommended_date).getTime() - new Date(b.recommended_date).getTime());
      const earliestDue = patientFollowUps[0].recommended_date;
      if (earliestDue) {
        followUpDue = new Date(earliestDue).getTime() <= new Date().getTime();
        if (!nextFollowUp) {
          nextFollowUp = new Date(earliestDue).toLocaleDateString("en-IN", {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
      }
    }

    return {
      id: p.id,
      name: p.full_name || "Unknown",
      age,
      gender: p.gender || "Unknown",
      phone: userObj?.mobile || "",
      abha,
      bloodGroup: "O+",
      prakriti: p.prakriti || "Unknown",
      lastVisit: lastVisit !== "No visits" ? new Date(lastVisit).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "No visits",
      lastVisitDaysAgo,
      nextFollowUp,
      followUpDue,
      isToday,
      conditions: problems.map((pr: any) => pr.name).join(" · ") || "No recorded conditions",
      systems: ["Ayurveda"],
      totalVisits: visits.length,
      problems,
      allergySummary: "No known allergies",
      activeMeds: 0,
      vitals,
    };
  });
}

export async function savePatientVitals(patientId: string, vitals: any): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("health_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("title", "Vitals")
    .eq("record_date", today)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("health_records")
      .update({ summary: JSON.stringify(vitals) })
      .eq("id", existing.id);
    if (error) console.error("savePatientVitals update error:", error);
  } else {
    const { error } = await supabase
      .from("health_records")
      .insert({
        patient_id: patientId,
        record_type: "tracker",
        title: "Vitals",
        summary: JSON.stringify(vitals),
        record_date: today,
      });
    if (error) console.error("savePatientVitals insert error:", error);
  }
}

export async function addPatientProblem(
  patientId: string,
  problem: { code: string; name: string; status: "active" | "controlled" | "resolved" }
): Promise<void> {
  const { data: existing } = await supabase
    .from("health_records")
    .select("id, summary")
    .eq("patient_id", patientId)
    .eq("title", "Problems")
    .maybeSingle();

  let problems = [];
  if (existing && existing.summary) {
    try {
      problems = JSON.parse(existing.summary);
    } catch (e) { }
  }

  problems.push(problem);

  if (existing) {
    const { error } = await supabase
      .from("health_records")
      .update({ summary: JSON.stringify(problems) })
      .eq("id", existing.id);
    if (error) console.error("addPatientProblem update error:", error);
  } else {
    const { error } = await supabase
      .from("health_records")
      .insert({
        patient_id: patientId,
        record_type: "tracker",
        title: "Problems",
        summary: JSON.stringify(problems),
        record_date: new Date().toISOString().split("T")[0],
      });
    if (error) console.error("addPatientProblem insert error:", error);
  }
}

export async function removePatientProblem(patientId: string, problemCode: string): Promise<void> {
  const { data: existing } = await supabase
    .from("health_records")
    .select("id, summary")
    .eq("patient_id", patientId)
    .eq("title", "Problems")
    .maybeSingle();

  if (!existing || !existing.summary) return;

  let problems = [];
  try {
    problems = JSON.parse(existing.summary);
  } catch (e) { }

  problems = problems.filter((p: any) => p.code !== problemCode);

  const { error } = await supabase
    .from("health_records")
    .update({ summary: JSON.stringify(problems) })
    .eq("id", existing.id);
  if (error) console.error("removePatientProblem error:", error);
}

export async function savePatientNote(patientId: string, noteText: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("health_records")
    .insert({
      patient_id: patientId,
      record_type: "consultation",
      title: "Clinical Note",
      summary: noteText,
      record_date: today,
    });
  if (error) console.error("savePatientNote error:", error);
}


export async function updatePatient(
  patientId: string,
  updates: {
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    city?: string;
    prakriti?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .update({
      full_name: updates.fullName,
      date_of_birth: updates.dateOfBirth,
      gender: updates.gender?.toLowerCase(),
      city: updates.city,
      prakriti: updates.prakriti
    })
    .eq("id", patientId);

  if (error) {
    console.error("updatePatient error:", error);
    throw error;
  }
}

export async function deletePatientRecord(patientId: string): Promise<void> {
  const { error } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId);
  if (error) console.error("deletePatientRecord error:", error);
}

// ---------------------------------------------------------------------------
// Appointments (GET, CANCEL)
// ---------------------------------------------------------------------------

export type AppointmentRow = {
  id: string;
  doctor: string;
  practitionerId: string;
  consultationId?: string;
  initials: string;
  specialty: string;
  date: string;
  dateRaw: string;
  mode: "video" | "clinic";
  status: "upcoming" | "past" | "cancelled";
  fee: string;
  duration?: string;
  rating?: number;
  hasPrescription?: boolean;
  reason?: string;
  refunded?: boolean;
  reminder: boolean;
};

export async function getAppointments(patientIdInput: string): Promise<AppointmentRow[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id, mode, status, reason_for_visit,
      scheduled_date, scheduled_time, duration_min,
      cancellation_reason, cancelled_at,
      slot:slots ( fee ),
      practitioner:practitioners (
        id, full_name, specializations, disciplines
      ),
      consultation:consultations (
        id,
        rating:ratings ( stars )
      )
    `)
    .eq("patient_id", resolvedPatientId)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  if (error) { console.error("getAppointments error:", error); return []; }

  return (data ?? []).map((row: any) => {
    const prac = row.practitioner ?? {};
    const name = prac.full_name ?? "Unknown Doctor";
    const initials = name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const specs = [...(prac.specializations ?? []), ...(prac.disciplines ?? [])];
    const fee = row.slot?.fee ? `₹${Math.round(row.slot.fee / 100)}` : "—";

    const dateObj = new Date(row.scheduled_date + "T" + (row.scheduled_time ?? "00:00"));
    const isToday = row.scheduled_date === new Date().toISOString().split("T")[0];
    const dateStr = isToday
      ? `Today, ${fmtTime(row.scheduled_time)}`
      : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " · " + fmtTime(row.scheduled_time);

    let status: "upcoming" | "past" | "cancelled" = "upcoming";
    if (row.status === "completed") status = "past";
    else if (row.status === "cancelled" || row.status === "no_show") status = "cancelled";
    else if (["scheduled", "checked_in", "in_session", "rescheduled"].includes(row.status)) status = "upcoming";

    const consultArr = Array.isArray(row.consultation) ? row.consultation : row.consultation ? [row.consultation] : [];
    const consult = consultArr[0];
    const ratingObj = consult?.rating;
    const ratingArr = Array.isArray(ratingObj) ? ratingObj : ratingObj ? [ratingObj] : [];

    return {
      id: row.id,
      doctor: name,
      practitionerId: prac.id,
      consultationId: consult?.id,
      initials,
      specialty: specs.join(" · ") || "AYUSH",
      date: dateStr,
      dateRaw: row.scheduled_date,
      mode: row.mode as "video" | "clinic",
      status,
      fee,
      duration: row.duration_min ? `${row.duration_min} min` : undefined,
      rating: ratingArr[0]?.stars,
      hasPrescription: consultArr.length > 0,
      reason: row.cancellation_reason,
      refunded: row.status === "cancelled",
      reminder: false,
    };
  });
}

export async function cancelAppointment(appointmentId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);
  if (error) console.error("cancelAppointment error:", error);
}

export async function bookAppointment(params: {
  userId: string;
  slotId: string;
  practitionerId: string;
  mode: "video" | "clinic";
  reason: string;
  date: string;
  time: string;
  familyMemberId?: string;
}): Promise<void> {
  const resolvedPatientId = await resolvePatientId(params.userId);

  const { error: apptError } = await supabase
    .from("appointments")
    .insert({
      slot_id: params.slotId,
      practitioner_id: params.practitionerId,
      patient_id: resolvedPatientId,
      family_member_id: params.familyMemberId || null,
      mode: params.mode,
      status: "scheduled",
      reason_for_visit: params.reason,
      scheduled_date: params.date,
      scheduled_time: params.time,
    });

  if (apptError) {
    console.error("bookAppointment insert error:", apptError);
    throw apptError;
  }

  const { error: slotError } = await supabase
    .from("slots")
    .update({ status: "booked" })
    .eq("id", params.slotId);

  if (slotError) {
    console.error("bookAppointment slot update error:", slotError);
  }
}

export async function submitRating(params: {
  userId: string;
  consultationId: string;
  practitionerId: string;
  stars: number;
  reviewText: string;
}): Promise<void> {
  const resolvedPatientId = await resolvePatientId(params.userId);
  const { error } = await supabase
    .from("ratings")
    .insert({
      consultation_id: params.consultationId,
      patient_id: resolvedPatientId,
      practitioner_id: params.practitionerId,
      stars: params.stars,
      review_text: params.reviewText,
      is_visible: true,
    });
  if (error) {
    console.error("submitRating error:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Notifications (GET, MARK READ)
// ---------------------------------------------------------------------------

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  deepLink: string | null;
  createdAt: string;
  timeAgo: string;
};

export async function getNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { console.error("getNotifications error:", error); return []; }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title ?? "",
    body: row.body ?? "",
    type: row.type ?? "general",
    isRead: row.is_read ?? false,
    deepLink: row.deep_link,
    createdAt: row.created_at,
    timeAgo: timeAgo(row.created_at),
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) console.error("markNotificationRead error:", error);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) console.error("markAllNotificationsRead error:", error);
}

// ---------------------------------------------------------------------------
// Family Members (CRUD)
// ---------------------------------------------------------------------------

export type FamilyMemberRow = {
  id: string;
  name: string;
  relationship: string;
  dob: string;
  age: number;
  gender: string;
  abhaId: string | null;
  prakriti: string | null;
};

export async function getFamilyMembers(patientIdInput: string): Promise<FamilyMemberRow[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("family_members")
    .select("*")
    .eq("owner_patient_id", resolvedPatientId)
    .order("created_at", { ascending: true });

  if (error) { console.error("getFamilyMembers error:", error); return []; }

  return (data ?? []).map((row: any) => {
    let age = 0;
    if (row.date_of_birth) {
      age = new Date().getFullYear() - new Date(row.date_of_birth).getFullYear();
    }
    return {
      id: row.id,
      name: row.full_name ?? "",
      relationship: row.relationship ?? "other",
      dob: row.date_of_birth ?? "",
      age,
      gender: row.gender ?? "",
      abhaId: row.abha_id,
      prakriti: row.prakriti,
    };
  });
}

export async function addFamilyMember(patientIdInput: string, member: {
  fullName: string; relationship: string; dob: string; gender: string;
}): Promise<void> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { error } = await supabase.from("family_members").insert({
    owner_patient_id: resolvedPatientId,
    full_name: member.fullName,
    relationship: member.relationship,
    date_of_birth: member.dob,
    gender: member.gender,
  });
  if (error) console.error("addFamilyMember error:", error);
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) console.error("deleteFamilyMember error:", error);
}

// ---------------------------------------------------------------------------
// Patient Profile (GET, UPDATE)
// ---------------------------------------------------------------------------

export type PatientProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  age: number;
  gender: string;
  city: string;
  pinCode: string;
  prakriti: string;
  wellnessGoals: string[];
  abhaId: string | null;
  abhaAddress: string | null;
  address?: string;
};

export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  const { data: pat, error } = await supabase
    .from("patients")
    .select(`
      id, full_name, date_of_birth, gender, city, pin_code, prakriti, wellness_goals, address,
      user:users (
        id, mobile, email,
        abha:abha_links ( abha_id, abha_address )
      )
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !pat) return null;

  const user = Array.isArray(pat.user) ? pat.user[0] : pat.user;
  const abhaObj = (user as any)?.abha;
  const abha = Array.isArray(abhaObj) ? abhaObj[0] : abhaObj;
  let age = 0;
  if (pat.date_of_birth) age = new Date().getFullYear() - new Date(pat.date_of_birth).getFullYear();

  return {
    id: pat.id,
    name: pat.full_name ?? "",
    email: (user as any)?.email ?? "",
    phone: (user as any)?.mobile ?? "",
    dob: pat.date_of_birth ?? "",
    age,
    gender: pat.gender ?? "",
    city: pat.city ?? "",
    pinCode: pat.pin_code ?? "",
    prakriti: pat.prakriti ?? "Unknown",
    wellnessGoals: pat.wellness_goals ?? [],
    abhaId: (abha as any)?.abha_id ?? null,
    abhaAddress: (abha as any)?.abha_address ?? null,
    address: (pat as any).address ?? "",
  };
}

export async function updateProfile(userId: string, updates: {
  fullName?: string; dob?: string; gender?: string; city?: string; pinCode?: string;
  email?: string;
}): Promise<void> {
  const patientUpdates: Record<string, unknown> = {};
  if (updates.fullName) patientUpdates.full_name = updates.fullName;
  if (updates.dob) patientUpdates.date_of_birth = updates.dob;
  if (updates.gender) patientUpdates.gender = updates.gender.toLowerCase();
  if (updates.city) patientUpdates.city = updates.city;
  if (updates.pinCode) patientUpdates.pin_code = updates.pinCode;

  if (Object.keys(patientUpdates).length > 0) {
    const { error } = await supabase.from("patients").update(patientUpdates).eq("user_id", userId);
    if (error) console.error("updateProfile patient error:", error);
  }
  if (updates.email) {
    const { error } = await supabase.from("users").update({ email: updates.email }).eq("id", userId);
    if (error) console.error("updateProfile user error:", error);
  }
}

// ---------------------------------------------------------------------------
// Prescriptions (GET for patient view)
// ---------------------------------------------------------------------------

export type PrescriptionView = {
  id: string;
  date: string;
  doctorName: string;
  doctorInitials: string;
  specialty: string;
  status: string;
  dietaryAdvice: string;
  lifestyleAdvice: string;
  physicalActivity: string;
  followUpDate: string | null;
  chiefComplaint: string;
  assessment: string;
  items: { name: string; dose: string; frequency: string; anupana: string; durationDays: number; instructions: string }[];
  isDetailed?: boolean;
  _raw?: any;
};

export async function getPatientPrescriptions(patientIdInput: string): Promise<PrescriptionView[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("prescriptions")
    .select(`
      id, status, dietary_advice, lifestyle_advice, physical_activity, followup_date, created_at,
      practitioner:practitioners ( full_name, specializations, disciplines ),
      consultation:consultations (
        emr_note:emr_notes ( chief_complaint, assessment )
      ),
      prescription_items ( medicine_name, dose, frequency, anupana, duration_days, special_instructions, sort_order )
    `)
    .eq("patient_id", resolvedPatientId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getPatientPrescriptions error:", error); return []; }

  return (data ?? []).map((row: any) => {
    const prac = row.practitioner ?? {};
    const name = prac.full_name ?? "Doctor";
    const initials = name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const consult = Array.isArray(row.consultation) ? row.consultation[0] : row.consultation;
    const emr = consult?.emr_note ? (Array.isArray(consult.emr_note) ? consult.emr_note[0] : consult.emr_note) : {};

    return {
      id: row.id,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
      doctorName: name,
      doctorInitials: initials,
      specialty: [...(prac.specializations ?? []), ...(prac.disciplines ?? [])].join(" · ") || "AYUSH",
      status: row.status ?? "finalized",
      dietaryAdvice: row.dietary_advice ?? "",
      lifestyleAdvice: row.lifestyle_advice ?? "",
      physicalActivity: row.physical_activity ?? "",
      followUpDate: row.followup_date,
      chiefComplaint: emr?.chief_complaint ?? "",
      assessment: emr?.assessment ?? "",
      items: (row.prescription_items ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item: any) => ({
          name: item.medicine_name ?? "",
          dose: item.dose ?? "",
          frequency: item.frequency ?? "",
          anupana: item.anupana ?? "",
          durationDays: item.duration_days ?? 0,
          instructions: item.special_instructions ?? "",
        })),
    };
  });
}

// ---------------------------------------------------------------------------
// Slots (for booking page)
// ---------------------------------------------------------------------------

export type SlotView = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: "video" | "clinic";
  fee: number;
  status: string;
};

export async function getPractitionerAvailableDates(practIdInput: string): Promise<string[]> {
  const resolvedPractId = await resolvePractitionerId(practIdInput);

  try {
    const { data: schedules, error } = await supabase
      .from("availability_schedules")
      .select("day_of_week")
      .eq("practitioner_id", resolvedPractId)
      .eq("is_active", true);

    if (error || !schedules) return [];

    const activeDays = new Set(schedules.map(s => s.day_of_week));
    const dates: string[] = [];
    const todayObj = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(todayObj.getDate() + i);
      const jsDay = d.getDay();
      const dbDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun
      if (activeDays.has(dbDay)) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }

    return dates;
  } catch (error) {
    console.error("getPractitionerAvailableDates error:", error);
    return [];
  }
}

export async function getPractitionerSlots(practitionerIdInput: string, date: string): Promise<SlotView[]> {
  const resolvedPractitionerId = await resolvePractitionerId(practitionerIdInput);

  // Query ALL slots for this date to see if generation has happened
  const { data: initialSlots, error: fetchError } = await supabase
    .from("slots")
    .select("id, slot_date, start_time, end_time, mode, fee, status")
    .eq("practitioner_id", resolvedPractitionerId)
    .eq("slot_date", date);

  let allSlots = initialSlots;

  if (fetchError) {
    console.error("getPractitionerSlots fetch error:", fetchError);
    return [];
  }

  // If no slots exist, run the on-the-fly generator
  if (!allSlots || allSlots.length === 0) {
    const parts = date.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun

    const { data: schedule, error: schedError } = await supabase
      .from("availability_schedules")
      .select("start_time, end_time, break_start, break_end, is_active")
      .eq("practitioner_id", resolvedPractitionerId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    if (!schedError && schedule) {
      const { data: practitioner, error: pracError } = await supabase
        .from("practitioners")
        .select("slot_duration_min, buffer_min, base_video_fee, base_clinic_fee")
        .eq("id", resolvedPractitionerId)
        .maybeSingle();

      if (!pracError && practitioner) {
        const startMin = timeToMinutes(schedule.start_time);
        let endMin = timeToMinutes(schedule.end_time);

        // Handle wrap-around midnight schedules
        if (startMin === endMin && schedule.start_time === "00:00:00") {
          // 00:00:00 to 00:00:00 means 0 hours, skip generation
          endMin = startMin;
        } else if (endMin <= startMin) {
          endMin += 1440;
        }

        const breakStartMin = schedule.break_start ? timeToMinutes(schedule.break_start) : null;
        let breakEndMin = schedule.break_end ? timeToMinutes(schedule.break_end) : null;
        if (breakStartMin !== null && breakEndMin !== null && breakEndMin <= breakStartMin) {
          breakEndMin += 1440;
        }

        const duration = practitioner.slot_duration_min || 20;
        const buffer = practitioner.buffer_min || 0;
        const videoFee = practitioner.base_video_fee || 0;
        const clinicFee = practitioner.base_clinic_fee || 0;

        const slotsToInsert: any[] = [];
        let current = startMin;

        while (current + duration <= endMin) {
          const slotStart = current;
          const slotEnd = current + duration;

          const overlapsBreak = breakStartMin !== null && breakEndMin !== null && (
            (slotStart >= breakStartMin && slotStart < breakEndMin) ||
            (slotEnd > breakStartMin && slotEnd <= breakEndMin) ||
            (slotStart < breakStartMin && slotEnd > breakEndMin)
          );

          if (!overlapsBreak) {
            const startTimeStr = minutesToTime(slotStart);
            const endTimeStr = minutesToTime(slotEnd);

            if (videoFee > 0) {
              slotsToInsert.push({
                practitioner_id: resolvedPractitionerId,
                mode: "video",
                slot_date: date,
                start_time: startTimeStr,
                end_time: endTimeStr,
                status: "open",
                fee: videoFee,
              });
            }
            if (clinicFee > 0) {
              slotsToInsert.push({
                practitioner_id: resolvedPractitionerId,
                mode: "clinic",
                slot_date: date,
                start_time: startTimeStr,
                end_time: endTimeStr,
                status: "open",
                fee: clinicFee,
              });
            }
          }
          current = slotEnd + buffer;
        }

        if (slotsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("slots")
            .insert(slotsToInsert);

          if (!insertError) {
            // Re-fetch ALL slots
            const { data: reFetched } = await supabase
              .from("slots")
              .select("id, slot_date, start_time, end_time, mode, fee, status")
              .eq("practitioner_id", resolvedPractitionerId)
              .eq("slot_date", date);

            if (reFetched) {
              allSlots = reFetched;
            }
          } else {
            console.error("Failed to insert generated slots:", insertError);
          }
        }
      }
    }
  }

  // Filter for 'open' status slots and order them by start_time ascending
  const openSlots = (allSlots ?? [])
    .filter((slot: any) => slot.status === "open")
    .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

  return openSlots.map((row: any) => ({
    id: row.id,
    date: row.slot_date,
    startTime: fmtTime(row.start_time),
    endTime: fmtTime(row.end_time),
    mode: row.mode,
    fee: Math.round((row.fee ?? 0) / 100),
    status: row.status,
  }));
}

// ---------------------------------------------------------------------------
// Consent Grants (CRUD)
// ---------------------------------------------------------------------------

export type ConsentView = {
  id: string;
  practitionerName: string;
  practitionerInitials: string;
  action: string;
  duration: string;
  recordTypes: string[];
  expiresAt: string | null;
  createdAt: string;
};

export async function getConsentGrants(patientIdInput: string): Promise<ConsentView[]> {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  const { data, error } = await supabase
    .from("consent_grants")
    .select(`
      id, action, duration, record_types, expires_at, created_at,
      practitioner:practitioners ( full_name )
    `)
    .eq("patient_id", resolvedPatientId)
    .order("created_at", { ascending: false });

  if (error) { console.error("getConsentGrants error:", error); return []; }

  return (data ?? []).map((row: any) => {
    const name = row.practitioner?.full_name ?? "Unknown";
    return {
      id: row.id,
      practitionerName: name,
      practitionerInitials: name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      action: row.action ?? "granted",
      duration: row.duration ?? "session_only",
      recordTypes: row.record_types ?? [],
      expiresAt: row.expires_at,
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
    };
  });
}

export async function revokeConsent(consentId: string): Promise<void> {
  const { error } = await supabase
    .from("consent_grants")
    .update({ action: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", consentId);
  if (error) console.error("revokeConsent error:", error);
}

// ---------------------------------------------------------------------------
// Bounded Messages (GET, SEND) — Post-consult + Pro Inbox
// ---------------------------------------------------------------------------

export type MessageRow = {
  id: string;
  consultationId: string;
  senderName: string;
  direction: string;
  content: string;
  sentAt: string;
  isRead: boolean;
};

export async function getBoundedMessages(consultationId: string): Promise<MessageRow[]> {
  if (!consultationId || consultationId.length !== 36) {
    return [];
  }

  const { data, error } = await supabase
    .from("bounded_messages")
    .select("id, consultation_id, direction, content, sent_at, read_at, sender:users ( id )")
    .eq("consultation_id", consultationId)
    .order("sent_at", { ascending: true });

  if (error) { console.error("getBoundedMessages error:", error); return []; }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    consultationId: row.consultation_id,
    senderName: row.direction === "patient_to_doctor" ? "You" : "Doctor",
    direction: row.direction,
    content: row.content ?? "",
    sentAt: row.sent_at ? new Date(row.sent_at).toLocaleString("en-IN") : "",
    isRead: !!row.read_at,
  }));
}

export async function sendBoundedMessage(params: {
  consultationId: string;
  senderUserId: string;
  direction: "doctor_to_patient" | "patient_to_doctor";
  content: string;
}): Promise<void> {
  const { error } = await supabase
    .from("bounded_messages")
    .insert({
      consultation_id: params.consultationId,
      sender_user_id: params.senderUserId,
      direction: params.direction,
      content: params.content,
    });
  if (error) {
    console.error("sendBoundedMessage error:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Practitioner Schedules (GET, UPDATE)
// ---------------------------------------------------------------------------

export type ScheduleRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  clinicId: string | null;
  isActive: boolean;
};

export async function getPractitionerSchedules(practIdInput: string): Promise<ScheduleRow[]> {
  const practId = await resolvePractitionerId(practIdInput);
  const { data, error } = await supabase
    .from("availability_schedules")
    .select("*")
    .eq("practitioner_id", practId)
    .order("day_of_week", { ascending: true });

  if (error) { console.error("getPractitionerSchedules error:", error); return []; }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time ?? "",
    endTime: row.end_time ?? "",
    breakStart: row.break_start,
    breakEnd: row.break_end,
    clinicId: row.clinic_id,
    isActive: row.is_active ?? true,
  }));
}

export async function updatePractitionerSchedule(practIdInput: string, schedules: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  isActive: boolean;
}[]): Promise<void> {
  const practId = await resolvePractitionerId(practIdInput);

  const { error: deleteError } = await supabase
    .from("availability_schedules")
    .delete()
    .eq("practitioner_id", practId);

  if (deleteError) {
    console.error("updatePractitionerSchedule delete error:", deleteError);
    throw deleteError;
  }

  const insertData = schedules.map((s) => ({
    practitioner_id: practId,
    day_of_week: s.dayOfWeek,
    start_time: s.startTime || null,
    end_time: s.endTime || null,
    break_start: s.breakStart || null,
    break_end: s.breakEnd || null,
    is_active: s.isActive,
  }));

  const { error: insertError } = await supabase
    .from("availability_schedules")
    .insert(insertData);

  if (insertError) {
    console.error("updatePractitionerSchedule insert error:", insertError);
    throw insertError;
  }
}

export async function updatePractitionerSettings(practIdInput: string, settings: {
  baseVideoFee: number;
  baseClinicFee: number;
  slotDurationMin: number;
  bufferMin: number;
}): Promise<void> {
  const practId = await resolvePractitionerId(practIdInput);
  const { error } = await supabase
    .from("practitioners")
    .update({
      base_video_fee: settings.baseVideoFee * 100, // rupees -> paise
      base_clinic_fee: settings.baseClinicFee * 100,
      slot_duration_min: settings.slotDurationMin,
      buffer_min: settings.bufferMin,
    })
    .eq("id", practId);

  if (error) {
    console.error("updatePractitionerSettings error:", error);
    throw error;
  }
}

export async function getBlockedDates(practIdInput: string): Promise<{ id: string; date: string; reason: string }[]> {
  const practId = await resolvePractitionerId(practIdInput);
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("id, block_date, reason")
    .eq("practitioner_id", practId)
    .gte("block_date", new Date().toISOString().split("T")[0])
    .order("block_date", { ascending: true });

  if (error) { console.error("getBlockedDates error:", error); return []; }
  return (data ?? []).map((r: any) => ({ id: r.id, date: r.block_date, reason: r.reason ?? "" }));
}

// ---------------------------------------------------------------------------
// Practitioner Follow-ups (GET)
// ---------------------------------------------------------------------------

export type FollowUpRow = {
  id: string;
  patientName: string;
  patientInitials: string;
  recommendedDate: string;
  isBooked: boolean;
  nudgeSent: boolean;
  patientAge: number;
};

export async function getPractitionerFollowUps(practIdInput: string): Promise<FollowUpRow[]> {
  const practId = await resolvePractitionerId(practIdInput);
  const { data, error } = await supabase
    .from("follow_ups")
    .select(`
      id, recommended_date, is_booked, nudge_sent_at,
      patient:patients ( full_name, date_of_birth )
    `)
    .eq("practitioner_id", practId)
    .order("recommended_date", { ascending: true });

  if (error) { console.error("getPractitionerFollowUps error:", error); return []; }

  return (data ?? []).map((row: any) => {
    const name = row.patient?.full_name ?? "Unknown";
    let patientAge = 35;
    if (row.patient?.date_of_birth) {
      patientAge = new Date().getFullYear() - new Date(row.patient.date_of_birth).getFullYear();
    }
    return {
      id: row.id,
      patientName: name,
      patientInitials: name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      recommendedDate: row.recommended_date ?? "",
      isBooked: row.is_booked ?? false,
      nudgeSent: !!row.nudge_sent_at,
      patientAge,
    };
  });
}

export async function nudgeFollowUp(followUpId: string): Promise<void> {
  const { error } = await supabase
    .from("follow_ups")
    .update({ nudge_sent_at: new Date().toISOString() })
    .eq("id", followUpId);
  if (error) console.error("nudgeFollowUp error:", error);
}

export async function updateFollowUpDate(followUpId: string, recommendedDate: string): Promise<void> {
  const { error } = await supabase
    .from("follow_ups")
    .update({ recommended_date: recommendedDate })
    .eq("id", followUpId);
  if (error) console.error("updateFollowUpDate error:", error);
}

// ---------------------------------------------------------------------------
// Practitioner Prescriptions (GET)
// ---------------------------------------------------------------------------

export async function getPractitionerPrescriptions(practIdInput: string): Promise<PrescriptionView[]> {
  const practId = await resolvePractitionerId(practIdInput);
  const { data, error } = await supabase
    .from("prescriptions")
    .select(`
      id, consultation_id, status, dietary_advice, lifestyle_advice, physical_activity, followup_date, created_at,
      patient:patients ( id, full_name, date_of_birth, gender, user_id, user:users(mobile) ),
      prescription_items ( medicine_name, dose, frequency, anupana, duration_days, special_instructions, sort_order ),
      consultation:consultations ( id, emr_notes ( chief_complaint, history_present, assessment, objective_findings, emr_attachments ( id, file_url, file_name, file_type ) ) )
    `)
    .eq("practitioner_id", practId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) { console.error("getPractitionerPrescriptions error:", error); return []; }

  return (data ?? []).map((row: any) => {
    const name = row.patient?.full_name ?? "Patient";
    const initials = name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    
    const patientObj = row.patient || {};
    let age = 0;
    if (patientObj.date_of_birth) {
      const birthDate = new Date(patientObj.date_of_birth);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    let rawAssessment: any = {};
    let rawFindings: any = {};
    let parsedChiefComplaints: any[] = [];
    let emr: any = null;
    
    try {
      emr = row.consultation?.emr_notes ? (Array.isArray(row.consultation.emr_notes) ? row.consultation.emr_notes[0] : row.consultation.emr_notes) : null;
      if (emr?.assessment) rawAssessment = JSON.parse(emr.assessment);
      if (emr?.objective_findings) rawFindings = JSON.parse(emr.objective_findings);
      if (emr?.chief_complaint) parsedChiefComplaints = JSON.parse(emr.chief_complaint);
    } catch(e) {}

    return {
      id: row.id,
      consultationId: row.consultation_id || row.consultation?.id,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
      doctorName: name, // maps to patientName on UI
      doctorInitials: initials, // maps to patientInitials on UI
      patientId: patientObj.id,
      patientName: name,
      gender: patientObj.gender || "Unknown",
      age: age || "N/A",
      phone: (Array.isArray(patientObj.user) ? patientObj.user[0]?.mobile : patientObj.user?.mobile) || "",
      specialty: "",
      status: row.status ?? "finalized",
      dietaryAdvice: row.dietary_advice ?? "",
      lifestyleAdvice: row.lifestyle_advice ?? "",
      physicalActivity: row.physical_activity ?? "",
      followUpDate: row.followup_date,
      chiefComplaint: parsedChiefComplaints?.length > 0 ? parsedChiefComplaints[0] : "",
      assessment: "",
      items: (row.prescription_items ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item: any) => ({
          name: item.medicine_name ?? "",
          dose: item.dose ?? "",
          frequency: item.frequency ?? "",
          anupana: item.anupana ?? "",
          durationDays: item.duration_days ?? 0,
          instructions: item.special_instructions ?? "",
          form: item.classical_type || "Tablet",
          timing: item.time_of_intake || item.anupana || "After Food"
        })),
      isDetailed: true,
      _raw: {
        visitReason: rawAssessment?.visitReason,
        chiefComplaints: parsedChiefComplaints,
        diagnosis: rawAssessment?.diagnosis,
        vitals: rawFindings?.vitals,
        dosha: rawAssessment?.dosha,
        vikriti: rawAssessment?.vikriti,
        prescriptionNotes: row.dietary_advice,
        presentIllness: emr?.history_present,
        previousHistory: rawAssessment?.previousHistory,
        previousCalls: rawAssessment?.previousCalls,
        attachments: emr?.emr_attachments || []
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Practitioner Inbox (GET)
// ---------------------------------------------------------------------------

export type InboxThread = {
  id: string;
  patientName: string;
  patientInitials: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  consultationId: string;
};

export async function getPractitionerInbox(practIdInput: string): Promise<InboxThread[]> {
  const practId = await resolvePractitionerId(practIdInput);
  const { data: consults, error } = await supabase
    .from("consultations")
    .select(`
      id, created_at,
      patient:patients ( full_name ),
      messages:bounded_messages ( content, sent_at, read_at, direction )
    `)
    .eq("practitioner_id", practId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) { console.error("getPractitionerInbox error:", error); return []; }

  return (consults ?? [])
    .filter((c: any) => (c.messages ?? []).length > 0)
    .map((c: any) => {
      const msgs = (c.messages ?? []).sort((a: any, b: any) =>
        new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );
      const last = msgs[0];
      const name = c.patient?.full_name ?? "Patient";
      return {
        id: c.id,
        patientName: name,
        patientInitials: name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        lastMessage: last?.content ?? "",
        lastMessageTime: last?.sent_at ? timeAgo(last.sent_at) : "",
        unread: msgs.some((m: any) => m.direction === "patient_to_doctor" && !m.read_at),
        consultationId: c.id,
      };
    });
}

// ---------------------------------------------------------------------------
// Practitioner Analytics (GET)
// ---------------------------------------------------------------------------

export type AnalyticsData = {
  totalConsultations: number;
  completedThisMonth: number;
  totalRevenue: number;
  revenueThisMonth: number;
  avgRating: number;
  totalRatings: number;
  avgDuration: number;
  monthlyConsults: { month: string; count: number }[];
};

export async function getPractitionerAnalytics(practIdInput: string): Promise<AnalyticsData> {
  const practId = await resolvePractitionerId(practIdInput);
  const thisMonth = new Date();
  const monthStart = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const [consultRes, ratingRes, paymentRes] = await Promise.all([
    supabase.from("consultations").select("id, duration_min, created_at, is_complete").eq("practitioner_id", practId),
    supabase.from("ratings").select("stars").eq("practitioner_id", practId),
    supabase.from("payments").select("amount_paise, confirmed_at").eq("status", "success"),
  ]);

  const consults = consultRes.data ?? [];
  const ratings = ratingRes.data ?? [];
  const payments = paymentRes.data ?? [];

  const completedThisMonth = consults.filter((c: any) => c.created_at >= monthStart && c.is_complete).length;
  const avgDur = consults.filter((c: any) => c.duration_min).reduce((a: number, c: any) => a + (c.duration_min ?? 0), 0) / (consults.filter((c: any) => c.duration_min).length || 1);
  const avgRating = ratings.length > 0 ? ratings.reduce((a: number, r: any) => a + r.stars, 0) / ratings.length : 0;
  const totalRevenue = payments.reduce((a: number, p: any) => a + (p.amount_paise ?? 0), 0);
  const revenueThisMonth = payments.filter((p: any) => p.confirmed_at && p.confirmed_at >= monthStart).reduce((a: number, p: any) => a + (p.amount_paise ?? 0), 0);

  return {
    totalConsultations: consults.length,
    completedThisMonth,
    totalRevenue: Math.round(totalRevenue / 100),
    revenueThisMonth: Math.round(revenueThisMonth / 100),
    avgRating: Math.round(avgRating * 10) / 10,
    totalRatings: ratings.length,
    avgDuration: Math.round(avgDur),
    monthlyConsults: [],
  };
}

// ---------------------------------------------------------------------------
// Medicines (GET for catalogue)
// ---------------------------------------------------------------------------

export type MedicineRow = {
  id: string;
  name: string;
  generic_name?: string | null;
  brand?: string | null;
  discipline: string;
  category?: string | null;
  pharmacopoeia?: string | null;
  standard_dose?: string | null;
  standard_dose_min?: number | null;
  standard_dose_max?: number | null;
  dose_unit?: string | null;
  price_paise?: number | null;
  is_controlled: boolean;
  is_active: boolean;
  created_at?: string;
};

export async function getMedicines(search?: string): Promise<MedicineRow[]> {
  let q = supabase
    .from("medicines")
    .select("id, name, generic_name, brand, discipline, category, pharmacopoeia, standard_dose, dose_unit, is_controlled, is_active, price_paise, created_at")
    .eq("is_active", true)
    .order("name");

  if (search) {
    q = q.ilike("name", `%${search}%`);
  }

  const { data, error } = await q.limit(50);
  if (error) { console.error("getMedicines error:", error); return []; }
  return data as MedicineRow[];
}

// ---------------------------------------------------------------------------
// Doctor Detail — Reviews (GET)
// ---------------------------------------------------------------------------

export type ReviewRow = {
  id: string;
  stars: number;
  text: string;
  patientName: string;
  date: string;
};

export async function getPractitionerReviews(practIdInput: string): Promise<ReviewRow[]> {
  const resolvedPractId = await resolvePractitionerId(practIdInput);
  const { data, error } = await supabase
    .from("ratings")
    .select(`id, stars, review_text, created_at, patient:patients ( full_name )`)
    .eq("practitioner_id", resolvedPractId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) { console.error("getPractitionerReviews error:", error); return []; }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    stars: row.stars ?? 5,
    text: row.review_text ?? "",
    patientName: row.patient?.full_name ?? "Patient",
    date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
  }));
}

// ---------------------------------------------------------------------------
// Post-Consult Data (GET)
// ---------------------------------------------------------------------------

export type PostConsultData = {
  consultation: { id: string; mode: string; date: string; duration: number } | null;
  prescription: PrescriptionView | null;
  carePlan: { followUpDate: string | null; followUpReason: string; monitoringNotes: string } | null;
};

export async function getPostConsultData(consultationId: string): Promise<PostConsultData> {
  const { data: consult } = await supabase
    .from("consultations")
    .select("id, mode, session_start, duration_min")
    .eq("id", consultationId)
    .maybeSingle();

  const { data: rx } = await supabase
    .from("prescriptions")
    .select(`
      id, status, dietary_advice, lifestyle_advice, physical_activity, followup_date, created_at,
      practitioner:practitioners ( full_name, specializations, disciplines ),
      prescription_items ( medicine_name, dose, frequency, anupana, duration_days, special_instructions, sort_order )
    `)
    .eq("consultation_id", consultationId)
    .maybeSingle();

  const { data: cp } = await supabase
    .from("care_plans")
    .select("followup_date, followup_reason, monitoring_notes")
    .eq("consultation_id", consultationId)
    .maybeSingle();

  let prescriptionView: PrescriptionView | null = null;
  if (rx) {
    const prac = (rx as any).practitioner ?? {};
    const name = prac.full_name ?? "Doctor";
    prescriptionView = {
      id: rx.id,
      date: rx.created_at ? new Date(rx.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "",
      doctorName: name,
      doctorInitials: name.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      specialty: [...(prac.specializations ?? []), ...(prac.disciplines ?? [])].join(" · ") || "AYUSH",
      status: rx.status ?? "finalized",
      dietaryAdvice: rx.dietary_advice ?? "",
      lifestyleAdvice: rx.lifestyle_advice ?? "",
      physicalActivity: rx.physical_activity ?? "",
      followUpDate: rx.followup_date,
      chiefComplaint: "",
      assessment: "",
      items: ((rx as any).prescription_items ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item: any) => ({
          name: item.medicine_name ?? "",
          dose: item.dose ?? "",
          frequency: item.frequency ?? "",
          anupana: item.anupana ?? "",
          durationDays: item.duration_days ?? 0,
          instructions: item.special_instructions ?? "",
        })),
    };
  }

  return {
    consultation: consult ? {
      id: consult.id,
      mode: consult.mode,
      date: consult.session_start ? new Date(consult.session_start).toLocaleDateString("en-IN") : "",
      duration: consult.duration_min ?? 0,
    } : null,
    prescription: prescriptionView,
    carePlan: cp ? {
      followUpDate: cp.followup_date,
      followUpReason: cp.followup_reason ?? "",
      monitoringNotes: cp.monitoring_notes ?? "",
    } : null,
  };
}

// ---------------------------------------------------------------------------
// Admin Queries
// ---------------------------------------------------------------------------

export async function getAdminDashboardStats(): Promise<{
  totalPatients: number; totalPractitioners: number; totalAppointments: number;
  totalOrders: number; revenue: number; pendingVerifications: number;
  totalClinics: number; totalMedicines: number;
}> {
  const [pats, pracs, appts, ords, pendingV, clinics, meds] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("practitioners").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("practitioners").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    supabase.from("clinics").select("id", { count: "exact", head: true }),
    supabase.from("medicines").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalPatients: pats.count ?? 0,
    totalPractitioners: pracs.count ?? 0,
    totalAppointments: appts.count ?? 0,
    totalOrders: ords.count ?? 0,
    revenue: 0,
    pendingVerifications: pendingV.count ?? 0,
    totalClinics: clinics.count ?? 0,
    totalMedicines: meds.count ?? 0,
  };
}

export async function getAdminPractitioners(): Promise<any[]> {
  const { data, error } = await supabase
    .from("practitioners")
    .select("id, full_name, disciplines, specializations, qualifications, experience_years, verification_status, rating_avg, rating_count, consultation_count, created_at, hpr_id, user:users ( mobile, email ), clinic_practitioners ( clinic:clinics ( id, name, city ) )")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAdminPractitioners error:", error); return []; }
  return data ?? [];
}

export async function verifyPractitioner(id: string, status: "verified" | "rejected", reason?: string): Promise<void> {
  const updates: Record<string, unknown> = { verification_status: status };
  if (reason) updates.rejection_reason = reason;
  const { error } = await supabase.from("practitioners").update(updates).eq("id", id);
  if (error) console.error("verifyPractitioner error:", error);
}

export async function createPractitioner(p: {
  name: string;
  specialty: string;
  qualification: string;
  hprId: string;
  email: string;
  phone: string;
  practiceType: "independent" | "hospital" | "both";
  clinicName: string;
  hospitalIds: string[];
  city: string;
}): Promise<void> {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .insert({
      mobile: p.phone,
      email: p.email,
      role: "practitioner",
    })
    .select("id")
    .single();

  if (userErr || !user) {
    console.error("createPractitioner error creating user:", userErr);
    throw new Error(userErr?.message ?? "Failed to create practitioner user");
  }

  const { data: prac, error: pracErr } = await supabase
    .from("practitioners")
    .insert({
      user_id: user.id,
      full_name: p.name,
      disciplines: [p.specialty],
      specializations: [p.specialty],
      qualifications: [p.qualification],
      hpr_id: p.hprId,
      verification_status: "pending",
    })
    .select("id")
    .single();

  if (pracErr || !prac) {
    console.error("createPractitioner error creating practitioner:", pracErr);
    throw new Error(pracErr?.message ?? "Failed to create practitioner profile");
  }

  if (p.hospitalIds && p.hospitalIds.length > 0) {
    const associations = p.hospitalIds.map((hid) => ({
      clinic_id: hid,
      practitioner_id: prac.id,
    }));
    const { error: assocErr } = await supabase.from("clinic_practitioners").insert(associations);
    if (assocErr) {
      console.error("createPractitioner error creating clinic affiliations:", assocErr);
    }
  }
}

export async function getAdminPatients(): Promise<any[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, date_of_birth, gender, prakriti, city, created_at, user:users ( mobile, email, is_active, abha:abha_links ( abha_id ) ), consultations ( id, session_start, is_complete, practitioner:practitioners ( id, full_name, disciplines ) )")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAdminPatients error:", error); return []; }

  return (data ?? []).map((pat: any) => {
    const user = Array.isArray(pat.user) ? pat.user[0] : pat.user;
    const abha = Array.isArray(user?.abha) ? user.abha : user?.abha ? [user.abha] : [];
    return {
      ...pat,
      abha,
    };
  });
}

export async function togglePatientStatus(patientId: string, isActive: boolean): Promise<void> {
  const { data: pat, error: getErr } = await supabase
    .from("patients")
    .select("user_id")
    .eq("id", patientId)
    .single();

  if (getErr || !pat) {
    console.error("togglePatientStatus error getting patient:", getErr);
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", pat.user_id);

  if (error) console.error("togglePatientStatus error updating user:", error);
}

export async function createPatient(p: {
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  city: string;
  abha: boolean;
  abhaId?: string;
}): Promise<void> {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .insert({
      mobile: p.phone,
      email: p.email,
      role: "patient",
    })
    .select("id")
    .single();

  if (userErr || !user) {
    console.error("createPatient error creating user:", userErr);
    throw new Error(userErr?.message ?? "Failed to create user");
  }

  const { data: pat, error: patErr } = await supabase
    .from("patients")
    .insert({
      user_id: user.id,
      full_name: p.name,
      date_of_birth: p.dob,
      gender: p.gender.toLowerCase() === "male" ? "M" : p.gender.toLowerCase() === "female" ? "F" : "O",
      city: p.city,
    })
    .select("id")
    .single();

  if (patErr || !pat) {
    console.error("createPatient error creating patient profile:", patErr);
    throw new Error(patErr?.message ?? "Failed to create patient profile");
  }

  if (p.abha && p.abhaId) {
    const { error: abhaErr } = await supabase
      .from("abha_links")
      .insert({
        user_id: user.id,
        abha_id: p.abhaId,
        abha_address: `${p.name.toLowerCase().replace(/\s+/g, "")}@abha`,
        full_name: p.name,
        date_of_birth: p.dob,
        gender: p.gender.toLowerCase() === "male" ? "M" : p.gender.toLowerCase() === "female" ? "F" : "O",
        is_verified: true,
      });
    if (abhaErr) console.error("createPatient error linking ABHA:", abhaErr);
  }
}

export async function getAdminOrders(): Promise<any[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total_paise, created_at, tracking_number, logistics_partner, patient:patients ( full_name, city, user:users ( mobile ) ), order_items ( id, medicine_name, quantity, unit_price_paise, total_price_paise )")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { console.error("getAdminOrders error:", error); return []; }
  return data ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string,
  logisticsPartner?: string
): Promise<void> {
  const updates: Record<string, any> = { status };
  if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;
  if (logisticsPartner !== undefined) updates.logistics_partner = logisticsPartner;
  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId);
  if (error) {
    console.error("updateOrderStatus error:", error);
    throw new Error(error.message);
  }
}

export async function getAdminMedicines(): Promise<MedicineRow[]> {
  const { data, error } = await supabase
    .from("medicines")
    .select("id, name, generic_name, brand, discipline, category, pharmacopoeia, standard_dose, dose_unit, is_controlled, is_active, price_paise, created_at")
    .order("name", { ascending: true });
  if (error) { console.error("getAdminMedicines error:", error); return []; }
  return data as MedicineRow[];
}

export async function createMedicine(m: {
  name: string;
  generic_name?: string;
  brand?: string;
  discipline: string;
  category: string;
  standard_dose?: string;
  price_paise?: number;
}): Promise<void> {
  const { error } = await supabase
    .from("medicines")
    .insert({
      name: m.name,
      generic_name: m.generic_name,
      brand: m.brand,
      discipline: m.discipline,
      category: m.category,
      standard_dose: m.standard_dose,
      price_paise: m.price_paise || 0,
      is_active: true,
    });
  if (error) {
    console.error("createMedicine error:", error);
    throw new Error(error.message);
  }
}

export async function updateMedicine(
  id: string,
  m: {
    name: string;
    generic_name?: string;
    brand?: string;
    discipline: string;
    category: string;
    standard_dose?: string;
    price_paise?: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from("medicines")
    .update({
      name: m.name,
      generic_name: m.generic_name,
      brand: m.brand,
      discipline: m.discipline,
      category: m.category,
      standard_dose: m.standard_dose,
      price_paise: m.price_paise,
    })
    .eq("id", id);
  if (error) {
    console.error("updateMedicine error:", error);
    throw new Error(error.message);
  }
}

export async function toggleMedicineActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("medicines")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    console.error("toggleMedicineActive error:", error);
    throw new Error(error.message);
  }
}

export async function getAdminClinics(): Promise<any[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("id, name, address_line1, city, state, pin_code, phone, is_active, hfr_id, hfr_verified, clinic_practitioners ( practitioner:practitioners ( full_name ) )")
    .order("name", { ascending: true });
  if (error) { console.error("getAdminClinics error:", error); return []; }
  return data ?? [];
}

export async function createClinic(c: {
  name: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  hfrId: string;
  phone: string;
}): Promise<void> {
  const { error } = await supabase
    .from("clinics")
    .insert({
      name: c.name,
      address_line1: c.address,
      city: c.city,
      state: c.state,
      pin_code: c.pin,
      hfr_id: c.hfrId,
      phone: c.phone,
      is_active: true,
    });
  if (error) {
    console.error("createClinic error:", error);
    throw new Error(error.message);
  }
}

export async function toggleClinicActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("clinics")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    console.error("toggleClinicActive error:", error);
    throw new Error(error.message);
  }
}

export type AddressInput = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
};

export type OrderItemInput = {
  medicineId?: string;
  medicineName: string;
  quantity: number;
  unitPricePaise: number;
};

export type PlaceOrderInput = {
  patientId: string;
  address: AddressInput;
  items: OrderItemInput[];
  shippingFeePaise: number;
};

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const resolvedPatientId = await resolvePatientId(input.patientId);

  // 1. Insert address
  const { data: addrData, error: addrError } = await supabase
    .from("patient_addresses")
    .insert({
      patient_id: resolvedPatientId,
      label: "Home",
      full_name: input.address.fullName,
      phone: input.address.phone,
      address_line1: input.address.addressLine1,
      address_line2: input.address.addressLine2 || null,
      city: input.address.city,
      state: input.address.state,
      pin_code: input.address.pinCode,
      is_default: false,
    })
    .select("id")
    .single();

  if (addrError) {
    console.error("placeOrder address error:", addrError);
    throw new Error(addrError.message);
  }

  const addressId = addrData.id;

  // Calculate prices
  const subtotal = input.items.reduce((acc, item) => acc + item.unitPricePaise * item.quantity, 0);
  const total = subtotal + input.shippingFeePaise;

  // 2. Insert order
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert({
      patient_id: resolvedPatientId,
      address_id: addressId,
      status: "placed",
      subtotal_paise: subtotal,
      delivery_fee_paise: input.shippingFeePaise,
      total_paise: total,
    })
    .select("id")
    .single();

  if (orderError) {
    console.error("placeOrder order error:", orderError);
    throw new Error(orderError.message);
  }

  const orderId = orderData.id;

  // 3. Insert order items
  const itemsToInsert = input.items.map((item) => ({
    order_id: orderId,
    medicine_id: item.medicineId || null,
    medicine_name: item.medicineName,
    quantity: item.quantity,
    unit_price_paise: item.unitPricePaise,
    total_price_paise: item.unitPricePaise * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("placeOrder items error:", itemsError);
    throw new Error(itemsError.message);
  }

  return orderId;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fmtTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hours = parseInt(h, 10);
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function minutesToTime(m: number): string {
  const wrapped = m % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00`;
}

export async function getPractitionerQueue(practitionerId: string): Promise<QueuePatient[]> {
  if (!practitionerId) return [];

  const today = new Date().toLocaleDateString("en-CA");

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      mode,
      status,
      reason_for_visit,
      scheduled_time,
      checked_in_at,
      patient:patients (
        id,
        full_name,
        date_of_birth,
        user:users (
          abha_links ( abha_id )
        )
      ),
      patient_profile:patient_profiles (
        id,
        full_name,
        date_of_birth,
        abha_number
      )
    `)
    .eq("practitioner_id", practitionerId)
    .eq("scheduled_date", today)
    .order("scheduled_time", { ascending: true });

  if (error) {
    console.error("Supabase Error Details:", error.message || error.details || error);
    return [];
  }

  const formattedQueue = (appointments || []).map((appt: any) => {
    const patient = appt.patient || {};
    const profile = appt.patient_profile || {};
    
    let userObj = Array.isArray(patient.user) ? patient.user[0] : patient.user;
    const abhaList = userObj?.abha_links || [];
    const abhaId = abhaList.length > 0 ? abhaList[0].abha_id : profile.abha_number;

    const fullName = patient.full_name || profile.full_name || "Unknown";
    const dob = patient.date_of_birth || profile.date_of_birth;

    let age = 0;
    if (dob) {
      const birthDate = new Date(dob);
      const todayDate = new Date();
      age = todayDate.getFullYear() - birthDate.getFullYear();
    }

    let waitMins = 0;
    if (appt.checked_in_at && appt.status === "checked_in") {
      const checkedInTime = new Date(appt.checked_in_at).getTime();
      waitMins = Math.floor((Date.now() - checkedInTime) / 60000);
    } else if (appt.status === "scheduled") {
      const [hours, minutes] = appt.scheduled_time.split(":");
      const scheduledTime = new Date();
      scheduledTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      const diff = Math.floor((Date.now() - scheduledTime.getTime()) / 60000);
      waitMins = diff > 0 ? diff : 0;
    }

    let mappedStatus = "waiting";
    if (appt.status === "checked_in") mappedStatus = "checked-in";
    else if (appt.status === "in_session") mappedStatus = "in-session";
    else if (appt.status === "completed") mappedStatus = "completed";

    const formatTime = (timeStr: string) => {
      if (!timeStr) return "";
      const [h, m] = timeStr.split(":");
      const hours = parseInt(h, 10);
      const period = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      return `${h12}:${m} ${period}`;
    };

    return {
      id: patient.id || profile.id,
      appointmentId: appt.id,
      name: fullName,
      age,
      time: formatTime(appt.scheduled_time),
      mode: appt.mode,
      status: mappedStatus as QueueStatus,
      waitMins: Math.max(0, waitMins),
      reason: appt.reason_for_visit || "Consultation",
      abha: abhaId,
    };
  });

  return formattedQueue;
}

export async function getPractitionerUpcomingAppointments(practitionerId: string): Promise<any[]> {
  if (!practitionerId) return [];

  const today = new Date().toLocaleDateString("en-CA");

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      mode,
      status,
      reason_for_visit,
      scheduled_date,
      scheduled_time,
      patient:patients (
        id,
        full_name,
        date_of_birth,
        gender
      ),
      patient_profile:patient_profiles (
        id,
        full_name,
        date_of_birth,
        gender
      )
    `)
    .eq("practitioner_id", practitionerId)
    .gte("scheduled_date", today)
    .in("status", ["scheduled", "rescheduled", "checked_in"])
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })
    .limit(20);

  if (error) {
    console.error("getPractitionerUpcomingAppointments error:", error);
    return [];
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hours = parseInt(h, 10);
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  const todayDate = new Date();

  return (appointments || []).map((appt: any) => {
    const patient = appt.patient || {};
    const profile = appt.patient_profile || {};
    
    const fullName = patient.full_name || profile.full_name || "Unknown";
    const dob = patient.date_of_birth || profile.date_of_birth;
    const gender = patient.gender || profile.gender || "";

    let age = 0;
    if (dob) {
      age = todayDate.getFullYear() - new Date(dob).getFullYear();
    }
    const isToday = appt.scheduled_date === today;
    const dateObj = new Date(appt.scheduled_date);
    const dateLabel = isToday
      ? "Today"
      : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });

    return {
      appointmentId: appt.id,
      patientId: patient.id || profile.id,
      name: fullName,
      age,
      gender: gender,
      date: appt.scheduled_date,
      dateLabel,
      time: formatTime(appt.scheduled_time),
      mode: appt.mode,
      status: appt.status,
      reason: appt.reason_for_visit || "Consultation",
      isToday,
    };
  });
}

export async function getPatientIntakeDetails(id: string) {
  let cleanId = id;
  if (id === "p1") cleanId = "c0000000-0000-0000-0000-000000000001";
  else if (id === "p2") cleanId = "c0000000-0000-0000-0000-000000000002";
  else if (id === "p3") cleanId = "c0000000-0000-0000-0000-000000000003";
  else if (id === "p4") cleanId = "c0000000-0000-0000-0000-000000000004";

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(cleanId)) {
    throw new Error("Invalid UUID");
  }

  // 1. Fetch Patient
  const { data: dbPat, error: patError } = await supabase
    .from("patients")
    .select(`
      id,
      full_name,
      date_of_birth,
      gender,
      prakriti,
      user_id,
      height,
      weight,
      blood_group,
      address,
      user:users (
        mobile,
        email
      )
    `)
    .eq("id", cleanId)
    .single();

  if (patError || !dbPat) {
    throw new Error("Error fetching patient");
  }

  // Fetch from patient_profiles if exists
  const { data: dbProfile } = await supabase
    .from("patient_profiles")
    .select("address, phone, height, weight, blood_group")
    .eq("user_id", dbPat.user_id)
    .maybeSingle();

  // 2. Fetch ABHA link
  const { data: dbAbha } = await supabase
    .from("abha_links")
    .select("abha_id, abha_address")
    .eq("user_id", dbPat.user_id)
    .maybeSingle();

  // 3. Fetch today's appointment or latest appointment for today's details
  const today = new Date().toISOString().split("T")[0];
  const { data: dbAppts } = await supabase
    .from("appointments")
    .select(`
      id,
      mode,
      scheduled_date,
      scheduled_time,
      reason_for_visit,
      status
    `)
    .eq("patient_id", cleanId)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false });

  const todayAppt = dbAppts?.find((a: any) => a.scheduled_date === today) || dbAppts?.[0];

  let age = 0;
  if (dbPat.date_of_birth) {
    const birthDate = new Date(dbPat.date_of_birth);
    age = new Date().getFullYear() - birthDate.getFullYear();
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hours = parseInt(h, 10);
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${period}`;
  };

  const patient = {
    name: dbPat.full_name || "Unknown",
    age,
    gender: dbPat.gender ? dbPat.gender.charAt(0).toUpperCase() + dbPat.gender.slice(1) : "Unknown",
    phone: dbProfile?.phone || (Array.isArray(dbPat.user) ? dbPat.user[0]?.mobile : (dbPat.user as any)?.mobile) || "",
    abha: dbAbha ? `${dbAbha.abha_id} (${dbAbha.abha_address || ""})` : null,
    prakriti: dbPat.prakriti || "Vata-Pitta",
    reason: todayAppt?.reason_for_visit || "Routine check-up",
    mode: (todayAppt?.mode === "video" ? "video" : "clinic") as "video" | "clinic",
    time: todayAppt ? formatTime(todayAppt.scheduled_time) : "N/A",
    symptoms: todayAppt?.reason_for_visit ? [todayAppt.reason_for_visit] : [],
    duration: todayAppt ? "Scheduled" : "N/A",
    height: dbProfile?.height || dbPat.height || 170,
    weight: dbProfile?.weight || dbPat.weight || 70,
    bloodGroup: dbProfile?.blood_group || dbPat.blood_group || "O+",
    address: dbProfile?.address || dbPat.address || "Bangalore, India",
  };

  // 4. Fetch Consultations, EMR Notes, and Prescriptions
  const { data: dbConsults } = await supabase
    .from("consultations")
    .select(`
      id,
      mode,
      created_at,
      appointment:appointments (
        id,
        scheduled_date,
        scheduled_time
      ),
      practitioner:practitioners (
        id,
        full_name,
        qualifications,
        specializations
      ),
      emr_note:emr_notes (
        id,
        chief_complaint,
        history_present,
        past_medical_hx,
        family_history,
        allergies,
        current_medications,
        objective_findings,
        assessment,
        plan,
        emr_attachments (
          id,
          file_url,
          file_name,
          file_type
        )
      ),
      prescriptions (
        id,
        dietary_advice,
        lifestyle_advice,
        physical_activity,
        followup_date,
        prescription_items (
          id,
          medicine_name,
          dose,
          frequency,
          duration_days,
          anupana,
          special_instructions,
          classical_type,
          time_of_intake
        )
      )
    `)
    .eq("patient_id", cleanId)
    .order("created_at", { ascending: false });

  let visits: VisitRecord[] = [];
  let vitalsHistory: VitalsRecord[] = [];
  let medHistory: MedicalHistory = {
    allergies: [], medications: [], pmh: [], surgeries: [], family: [],
    social: { occupation: "", marital: "", tobacco: "", alcohol: "", diet: "", exercise: "" },
    immunizations: []
  };
  let careTeam: any[] = [];

  if (dbConsults && dbConsults.length > 0) {
    visits = dbConsults.map((c: any) => {
      const dateStr = c.appointment?.scheduled_date
        ? new Date(c.appointment.scheduled_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
        : new Date(c.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

      const timeStr = c.appointment?.scheduled_time ? formatTime(c.appointment.scheduled_time) : "N/A";

      const medications = c.prescriptions?.[0]?.prescription_items?.map((item: any) => ({
        id: item.id,
        name: item.medicine_name,
        form: item.classical_type || "Tablet",
        dose: item.dose,
        timing: item.anupana || item.time_of_intake || "After Food",
        duration: item.duration_days ? `${item.duration_days} Days` : "",
        instructions: item.special_instructions || ""
      })) || [];

      // Parse SOAP
      const emr = c.emr_note || {};
      const soap = {
        S: emr.history_present || "No subjective notes",
        O: emr.objective_findings || "No objective notes",
        A: emr.assessment || "No assessment notes",
        P: emr.plan || "No plan notes"
      };

      // Parse assessment JSON for specific fields
      let parsedAssessment = {
        diagnosis: "",
        diseaseStage: "",
        severity: "",
        dosha: "",
        vikriti: "",
        visitReason: "",
        previousHistory: "",
        previousCalls: ""
      };
      if (emr.assessment) {
        try {
          if (emr.assessment.trim().startsWith("{")) {
            parsedAssessment = JSON.parse(emr.assessment);
          } else {
            parsedAssessment.diagnosis = emr.assessment;
          }
        } catch (e) {
          parsedAssessment.diagnosis = emr.assessment;
        }
      }

      // Parse chief complaint JSON array
      let chiefComplaintsArray: string[] = [];
      if (emr.chief_complaint) {
        try {
          if (emr.chief_complaint.trim().startsWith("[")) {
            chiefComplaintsArray = JSON.parse(emr.chief_complaint);
          } else {
            chiefComplaintsArray = [emr.chief_complaint];
          }
        } catch (e) {
          chiefComplaintsArray = [emr.chief_complaint];
        }
      }

      // Parse vitals if they are inside objective findings as text/json
      let vitals = null;
      if (emr.objective_findings) {
        try {
          if (emr.objective_findings.trim().startsWith("{")) {
            const parsed = JSON.parse(emr.objective_findings);
            const vData = parsed.vitals || parsed;
            if (vData.bpSys || vData.pulse || vData.weight || vData.height) {
              vitals = {
                bpSys: vData.bpSys || "",
                bpDia: vData.bpDia || "",
                pulse: vData.pulse || "",
                temp: vData.temp || "",
                spo2: vData.spo2 || "",
                rr: vData.rr || "",
                weight: vData.weight || "",
                height: vData.height || ""
              };
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      const docName = c.practitioner?.full_name || "Unknown Practitioner";
      const initials = docName.split(" ").filter((w: string) => w).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

      return {
        id: c.id,
        date: dateStr,
        time: timeStr,
        duration: "20 min",
        mode: c.mode || "clinic",
        doctor: docName,
        specialty: c.practitioner?.specializations?.[0] || "Ayurveda",
        doctorInitials: initials,
        isYou: false,
        chiefComplaints: chiefComplaintsArray,
        chiefComplaint: chiefComplaintsArray.join(", ") || "Routine consultation",
        soap,
        visitReason: parsedAssessment.visitReason || "",
        previousHistory: parsedAssessment.previousHistory || "",
        previousCalls: parsedAssessment.previousCalls || "",
        diagnosis: parsedAssessment.diagnosis || "Routine check-up",
        vitals,
        medications,
        investigations: [],
        referrals: [],
        followUpDate: c.prescriptions?.[0]?.followup_date || null,
        followUpInstructions: c.prescriptions?.[0]?.lifestyle_advice || "",
        type: "initial" as const,
        attachments: emr.emr_attachments || []
      };
    });

    const vitalsList = visits
      .filter(v => v.vitals)
      .map(v => ({
        date: v.date,
        doctor: v.doctor,
        doctorInitials: v.doctorInitials,
        isYou: v.isYou,
        ...v.vitals!
      }));

    if (vitalsList.length > 0) {
      vitalsHistory = vitalsList;
    }

    const activeMeds = visits.flatMap(v =>
      v.medications.map(m => {
        const sysVal = m.system;
        const system = (["Ayurveda", "Naturopathy", "Siddha", "Homeopathy", "Allopathic", "OTC"].includes(sysVal)
          ? sysVal
          : "Ayurveda") as "Ayurveda" | "Naturopathy" | "Siddha" | "Homeopathy" | "Allopathic" | "OTC";
        return {
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
          system: system,
          prescribedBy: v.doctor,
          since: v.date,
          active: true
        };
      })
    );

    if (activeMeds.length > 0) {
      medHistory.medications = activeMeds;
    }

    careTeam = Array.from(new Set(visits.map(v => v.doctor))).map(name => {
      const visit = visits.find(v => v.doctor === name)!;
      return {
        id: visit.id,
        name: name,
        initials: visit.doctorInitials,
        specialty: visit.specialty,
        qualification: "Registered Practitioner",
        hprId: "HPR-VERIFIED",
        since: visits[visits.length - 1].date,
        lastVisit: visit.date,
        nextFollowUp: visit.followUpDate || "N/A",
        totalRx: visit.medications.length,
        isYou: visit.isYou
      };
    });
  }

  return { patient, visits, vitalsHistory, medHistory, careTeam };
}

// ---------------------------------------------------------------------------
// AyurSanvaad Sprint 1: Doctor & Patient Profiles, Verifications & Discovery
// ---------------------------------------------------------------------------

export async function getNewDoctorVerificationQueue(): Promise<any[]> {
  const { data, error } = await supabase
    .from("doctor_verifications")
    .select(`
      id,
      doctor_id,
      degree_url,
      registration_cert_url,
      hpr_id,
      status,
      rejection_reason,
      created_at,
      doctor:doctor_profiles (
        id,
        user_id,
        full_name,
        photo_url,
        signature_url,
        consultation_fee,
        specializations,
        languages,
        user:users!doctor_profiles_user_id_fkey (
          email,
          mobile
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching verification queue:", error);
    return [];
  }
  return data || [];
}

export async function verifyNewDoctor(
  verificationId: string,
  doctorId: string,
  status: "verified" | "rejected",
  reason?: string
): Promise<void> {
  const reviewerId = (await supabase.auth.getUser()).data.user?.id;

  // 1. Update verification status
  const { error: verifyErr } = await supabase
    .from("doctor_verifications")
    .update({
      status,
      rejection_reason: reason || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", verificationId);

  if (verifyErr) {
    console.error("Error updating verification:", verifyErr);
    throw verifyErr;
  }

  // 2. If verified, activate doctor profile and update user role to doctor
  if (status === "verified") {
    const { error: profileErr } = await supabase
      .from("doctor_profiles")
      .update({ is_active: true })
      .eq("id", doctorId);

    if (profileErr) {
      console.error("Error activating doctor profile:", profileErr);
      throw profileErr;
    }

    // Get doctor profile to find user_id
    const { data: profile } = await supabase
      .from("doctor_profiles")
      .select("user_id")
      .eq("id", doctorId)
      .single();

    if (profile?.user_id) {
      const { error: userErr } = await supabase
        .from("users")
        .update({ role: "doctor" })
        .eq("id", profile.user_id);

      if (userErr) {
        console.error("Error updating user role to doctor:", userErr);
        throw userErr;
      }
    }
  }

  // 3. Log data access audit trail
  const { error: logErr } = await supabase
    .from("data_access_logs")
    .insert({
      doctor_id: doctorId,
      accessed_by: reviewerId || "00000000-0000-0000-0000-000000000000",
      purpose: "Admin verification review",
      record_type: "doctor_verifications",
      record_id: verificationId
    });

  if (logErr) {
    console.error("Error logging data access log:", logErr);
  }
}

export async function getDoctorProfileByUserId(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select(`
      *,
      verifications:doctor_verifications (
        id,
        status,
        rejection_reason,
        degree_url,
        registration_cert_url,
        hpr_id
      )
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading doctor profile:", error);
    return null;
  }
  return data;
}

export async function saveDoctorProfileAndVerification(p: {
  userId: string;
  fullName: string;
  photoUrl?: string;
  signatureUrl?: string;
  consultationFee: number;
  specializations: string[];
  languages: string[];
  degreeUrl: string;
  registrationCertUrl: string;
  hprId?: string;
}): Promise<void> {
  // 1. Insert doctor profile (inactive until verified)
  const { data: profile, error: profileErr } = await supabase
    .from("doctor_profiles")
    .upsert({
      user_id: p.userId,
      full_name: p.fullName,
      photo_url: p.photoUrl || null,
      signature_url: p.signatureUrl || null,
      consultation_fee: p.consultationFee,
      specializations: p.specializations,
      languages: p.languages,
      is_active: false
    })
    .select("id")
    .single();

  if (profileErr || !profile) {
    console.error("Error saving doctor profile:", profileErr);
    throw new Error(profileErr?.message || "Failed to save doctor profile");
  }

  // 2. Insert verification request
  const { error: verifyErr } = await supabase
    .from("doctor_verifications")
    .insert({
      doctor_id: profile.id,
      degree_url: p.degreeUrl,
      registration_cert_url: p.registrationCertUrl,
      hpr_id: p.hprId || null,
      status: "pending"
    });

  if (verifyErr) {
    console.error("Error submitting verification request:", verifyErr);
    throw new Error(verifyErr.message || "Failed to submit credentials");
  }
}

export async function getPatientProfileByUserId(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("patient_profiles")
    .select(`
      *,
      family_members:patient_family_members (*)
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading patient profile:", error);
    return null;
  }
  return data;
}

export async function savePatientProfile(
  p: {
    userId: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    email: string;
    address?: string;
    abhaNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  },
  // Accept an authenticated client from the caller (e.g. post-OTP onboarding).
  // Falls back to the module-level anon client when not provided.
  client?: ReturnType<typeof createClient>
): Promise<void> {
  const db = client ?? supabase;

  // Update users table role and abha number
  await db
    .from("users")
    .update({ role: "patient", abha_number: p.abhaNumber || null })
    .eq("id", p.userId);

  const { error } = await db
    .from("patient_profiles")
    .upsert(
      {
        user_id: p.userId,
        full_name: p.fullName,
        date_of_birth: p.dateOfBirth,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        address: p.address || null,
        abha_number: p.abhaNumber || null,
        emergency_contact_name: p.emergencyContactName || null,
        emergency_contact_phone: p.emergencyContactPhone || null,
        allergies: p.allergies || [],
        chronic_conditions: p.chronicConditions || [],
        current_medications: p.currentMedications || [],
        is_active: true,
      },
      { onConflict: "user_id" }  // explicit conflict target for upsert
    );

  if (error) {
    console.error("Error saving patient profile:", error);
    throw error;
  }
}

export async function getDiscoverDoctors(filters?: {
  specialty?: string;
  language?: string;
  mode?: "video" | "clinic";
  city?: string;
  ratingMin?: number;
  feeMax?: number;
  search?: string;
}): Promise<any[]> {
  // Fetch verified and active doctor profiles
  let query = supabase
    .from("doctor_profiles")
    .select(`
      *,
      user:users!doctor_profiles_user_id_fkey (email, mobile),
      verifications:doctor_verifications (status, hpr_id)
    `)
    .eq("is_active", true);

  const { data: doctors, error } = await query;
  if (error) {
    console.error("Error discovering doctors:", error);
    return [];
  }

  // Filter in memory for maximum reliability
  let filtered = doctors || [];

  if (filters?.specialty) {
    filtered = filtered.filter(d =>
      d.specializations?.some((s: string) => s.toLowerCase() === filters.specialty?.toLowerCase())
    );
  }

  if (filters?.language) {
    filtered = filtered.filter(d =>
      d.languages?.some((l: string) => l.toLowerCase() === filters.language?.toLowerCase())
    );
  }

  if (filters?.feeMax) {
    filtered = filtered.filter(d => d.consultation_fee <= filters.feeMax!);
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(d =>
      d.full_name?.toLowerCase().includes(s) ||
      d.specializations?.some((sp: string) => sp.toLowerCase().includes(s))
    );
  }

  return filtered;
}

export async function getDoctorSignedUrl(path: string): Promise<string | null> {
  // Remove bucket name prefix from path if included
  const cleanPath = path.replace(/^doctor-documents\//, "");
  const { data, error } = await supabase.storage.from("doctor-documents").createSignedUrl(cleanPath, 3600);
  if (error) {
    console.error("Error creating signed url:", error);
    return null;
  }
  return data?.signedUrl || null;
}

export async function getDoctorSlotsFromTemplates(doctorId: string, dateStr: string): Promise<any[]> {
  const dayOfWeek = new Date(dateStr).getDay();

  const { data: templates, error: tempErr } = await supabase
    .from("doctor_availability_templates")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  if (tempErr) {
    console.error("Error fetching templates:", tempErr);
    return [];
  }

  const { data: booked, error: bookErr } = await supabase
    .from("appointments")
    .select("scheduled_time")
    .eq("doctor_profile_id", doctorId)
    .eq("scheduled_date", dateStr)
    .neq("status", "cancelled");

  const bookedTimes = new Set((booked || []).map(b => b.scheduled_time?.slice(0, 5)));
  const slots: any[] = [];

  for (const t of templates || []) {
    const duration = t.slot_duration_minutes || 30;
    const [startH, startM] = t.start_time.split(":").map(Number);
    const [endH, endM] = t.end_time.split(":").map(Number);

    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (currentMin + duration <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      if (!bookedTimes.has(timeString)) {
        const displayHour = h % 12 === 0 ? 12 : h % 12;
        const ampm = h >= 12 ? "PM" : "AM";
        const displayTime = `${displayHour}:${String(m).padStart(2, "0")} ${ampm}`;

        slots.push({
          id: `${t.id}_${timeString}`,
          startTime: displayTime,
          timeValue: timeString,
          mode: t.consultation_mode,
        });
      }
      currentMin += duration;
    }
  }

  return slots;
}

export async function bookNewDoctorAppointment(params: {
  userId: string;
  doctorProfileId: string;
  mode: "video" | "clinic";
  reason: string;
  date: string;
  time: string;
  familyMemberId?: string;
}): Promise<void> {
  const { data: patientProfile, error: patErr } = await supabase
    .from("patient_profiles")
    .select("id")
    .eq("user_id", params.userId)
    .single();

  if (patErr || !patientProfile) {
    throw new Error("Patient profile not found. Please complete onboarding first.");
  }

  const resolvedPatientId = await resolvePatientId(params.userId);

  const { error: apptError } = await supabase
    .from("appointments")
    .insert({
      patient_profile_id: patientProfile.id,
      patient_id: resolvedPatientId,
      doctor_profile_id: params.doctorProfileId,
      practitioner_id: params.doctorProfileId,
      family_member_id: params.familyMemberId || null,
      mode: params.mode,
      status: "scheduled",
      reason_for_visit: params.reason,
      scheduled_date: params.date,
      scheduled_time: params.time,
      duration_min: 30,
    });

  if (apptError) {
    console.error("bookNewDoctorAppointment error:", apptError);
    throw apptError;
  }
}

export async function getNewDoctorAvailableDates(doctorId: string): Promise<string[]> {
  const { data: templates, error } = await supabase
    .from("doctor_availability_templates")
    .select("day_of_week")
    .eq("doctor_id", doctorId)
    .eq("is_active", true);

  if (error || !templates) return [];

  const activeDays = new Set(templates.map(t => t.day_of_week));
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    if (activeDays.has(d.getDay())) {
      dates.push(d.toISOString().split("T")[0]);
    }
  }
  return dates;
}

export async function saveCompleteConsultation(payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const practId = await resolvePractitionerId(payload.practitionerId);
    const patId = await resolvePatientId(payload.patientId);

    // 1. Create a mock slot to satisfy foreign keys
    const { data: slot, error: slotErr } = await supabase
      .from("slots")
      .insert({
        practitioner_id: practId,
        mode: "video",
        slot_date: new Date().toISOString().split("T")[0],
        start_time: "10:00:00",
        end_time: "10:30:00",
        fee: 0,
        status: "completed"
      })
      .select("id")
      .single();
    
    if (slotErr) throw new Error("Slot insertion failed: " + slotErr.message);

    // 2. Create appointment
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .insert({
        slot_id: slot.id,
        practitioner_id: practId,
        patient_id: patId,
        mode: "video",
        status: "completed",
        scheduled_date: new Date().toISOString().split("T")[0],
        scheduled_time: "10:00:00",
      })
      .select("id")
      .single();

    if (aptErr) throw new Error("Appointment insertion failed: " + aptErr.message);

    // 3. Create consultation
    const { data: consult, error: consultErr } = await supabase
      .from("consultations")
      .insert({
        appointment_id: apt.id,
        practitioner_id: practId,
        patient_id: patId,
        mode: "video",
        is_complete: true,
      })
      .select("id")
      .single();

    if (consultErr) throw new Error("Consultation insertion failed: " + consultErr.message);

    // 4. Create emr_notes
    const { data: emrData, error: emrErr } = await supabase
      .from("emr_notes")
      .insert({
        consultation_id: consult.id,
        practitioner_id: practId,
        patient_id: patId,
        chief_complaint: JSON.stringify(payload.chiefComplaints || []),
        history_present: payload.presentIllness || "",
        assessment: JSON.stringify({
          diagnosis: payload.diagnosis,
          diseaseStage: payload.diseaseStage,
          severity: payload.severity,
          dosha: payload.dosha,
          vikriti: payload.vikriti,
          visitReason: payload.visitReason,
          previousHistory: payload.previousHistory,
          previousCalls: payload.previousCalls,
        }),
        objective_findings: JSON.stringify({
          vitals: payload.vitals
        }),
        plan: payload.followUpInstructions || payload.doctorNotes || ""
      })
      .select("id")
      .single();

    if (emrErr) throw new Error("EMR notes insertion failed: " + emrErr.message);

    // 4.5 Insert EMR attachments if any reports were uploaded
    if (payload.reportUrls && payload.reportUrls.length > 0 && emrData) {
      const { data: practUser } = await supabase
        .from("practitioners")
        .select("user_id")
        .eq("id", practId)
        .single();

      const uploaderUserId = practUser?.user_id || payload.practitionerId || '00000000-0000-0000-0000-000000000001';

      const attachments = payload.reportUrls.map((url: string, idx: number) => ({
        emr_note_id: emrData.id,
        file_url: url,
        file_name: payload.reportNames?.[idx] || "Report",
        file_type: url.split('.').pop() || "pdf",
        uploaded_by: uploaderUserId
      }));

      const { error: attachErr } = await supabase
        .from("emr_attachments")
        .insert(attachments);

      if (attachErr) {
        console.error("EMR attachments insertion error:", attachErr);
      }
    }

    // Update patient's profile details (height, weight, blood group, address)
    const heightVal = parseInt(payload.vitals.height) || null;
    const weightVal = parseFloat(payload.vitals.weight) || null;
    const bloodGroupVal = payload.bloodGroup || null;
    const addressVal = payload.address || null;

    await supabase
      .from("patients")
      .update({
        height: heightVal,
        weight: weightVal,
        blood_group: bloodGroupVal,
        address: addressVal,
      })
      .eq("id", patId);

    const { data: patRow } = await supabase
      .from("patients")
      .select("user_id")
      .eq("id", patId)
      .single();

    if (patRow?.user_id) {
      await supabase
        .from("patient_profiles")
        .update({
          height: heightVal,
          weight: weightVal,
          blood_group: bloodGroupVal,
          address: addressVal,
        })
        .eq("user_id", patRow.user_id);
    }

    // 5. Create prescription
    const { data: rx, error: rxErr } = await supabase
      .from("prescriptions")
      .insert({
        consultation_id: consult.id,
        practitioner_id: practId,
        patient_id: patId,
        status: "finalized",
        dietary_advice: payload.prescriptionNotes || "", 
        lifestyle_advice: payload.followUpInstructions || "",
        followup_date: payload.followUpDate ? new Date(payload.followUpDate).toISOString().split('T')[0] : null,
      })
      .select("id")
      .single();

    if (rxErr) throw new Error("Prescription insertion failed: " + rxErr.message);

    // 6. Create prescription items
    if (payload.medicines && payload.medicines.length > 0) {
      const itemsToInsert = payload.medicines.map((m: any, idx: number) => ({
        prescription_id: rx.id,
        medicine_name: m.name,
        dose: m.dose,
        frequency: m.timing || "", // Fallback to empty string for db constraint
        anupana: m.timing, 
        duration_days: parseInt(m.duration) || 0,
        special_instructions: m.instructions,
        sort_order: idx,
        classical_type: m.form,
        time_of_intake: m.timing
      })).filter((m: any) => m.medicine_name);

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase
          .from("prescription_items")
          .insert(itemsToInsert);
        if (itemsErr) throw new Error("Prescription items failed: " + itemsErr.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("saveCompleteConsultation error:", err);
    return { success: false, error: err.message };
  }
}

export async function getDetailedConsultations(patientIdInput: string) {
  const resolvedPatientId = await resolvePatientId(patientIdInput);
  
  const { data, error } = await supabase
    .from("consultations")
    .select(`
      id,
      created_at,
      appointment_id,
      practitioners ( id, full_name, specializations, qualifications, hpr_id ),
      emr_notes ( 
        id,
        chief_complaint, 
        history_present, 
        assessment, 
        objective_findings, 
        plan,
        emr_attachments ( id, file_url, file_name, file_type )
      ),
      prescriptions ( 
        dietary_advice, 
        lifestyle_advice,
        followup_date, 
        prescription_items ( medicine_name, dose, frequency, anupana, duration_days, special_instructions ) 
      )
    `)
    .eq("patient_id", resolvedPatientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getDetailedConsultations error:", error);
    return [];
  }

  return data;
}

export async function getConsultationReportData(consultationId: string) {
  const { data, error } = await supabase
    .from("consultations")
    .select(`
      id,
      created_at,
      mode,
      appointment_id,
      practitioner_id,
      patients ( full_name, date_of_birth, gender, prakriti, city, user:users(mobile, abha:abha_links(abha_id)) ),
      practitioners ( id, full_name, specializations, qualifications, hpr_id ),
      emr_notes ( chief_complaint, history_present, assessment, objective_findings, plan ),
      prescriptions ( dietary_advice, lifestyle_advice, followup_date, prescription_items ( medicine_name, dose, frequency, anupana, duration_days, special_instructions ) )
    `)
    .eq("id", consultationId)
    .single();

  if (error) {
    console.error("getConsultationReportData error:", error);
    return null;
  }

  return data;
}

export async function deletePrescription(prescriptionId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("prescriptions")
    .delete()
    .eq("id", prescriptionId);
    
  if (error) {
    console.error("deletePrescription error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
