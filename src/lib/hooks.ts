"use client";

import { useEffect, useState } from "react";
import {
  getDiscoverMetadata,
  getPractitioners,
  getPractitionerById,
  getDinacharyaTasks,
  getHealthRecords,
  getOrders,
  getAppointments,
  getNotifications,
  getFamilyMembers,
  getPatientProfile,
  getPatientPrescriptions,
  getPractitionerPrescriptions,
  getConsentGrants,
  getPractitionerSchedules,
  getBlockedDates,
  getPractitionerFollowUps,
  getPractitionerInbox,
  getPractitionerAnalytics,
  getPractitionerReviews,
  getMedicines,
  getAdminDashboardStats,
  getAdminPractitioners,
  getAdminPatients,
  getAdminOrders,
  getAdminMedicines,
  getAdminClinics,
  getPractitionerSlots,
  getPractitionerAvailableDates,
  getPractitionerQueue,
  getPractitionerUpcomingAppointments,
  getPatientIntakeDetails,
  getNewDoctorVerificationQueue,
  getDoctorProfileByUserId,
  getPatientProfileByUserId,
  getDiscoverDoctors,
  getDoctorSlotsFromTemplates,
  getNewDoctorAvailableDates,
} from "./queries";
import type { Practitioner, DinacharTask, HealthRecord } from "./types";
import type {
  Order,
  AppointmentRow,
  NotificationRow,
  FamilyMemberRow,
  PatientProfile,
  PrescriptionView,
  ConsentView,
  ScheduleRow,
  FollowUpRow,
  InboxThread,
  AnalyticsData,
  MedicineRow,
  ReviewRow,
  SlotView,
  MessageRow,
} from "./queries";
import { getBoundedMessages } from "./queries";

// ---------------------------------------------------------------------------
// Generic hook factory
// ---------------------------------------------------------------------------

function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = () => {
    setLoading(true);
    fetcher()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message ?? "Unknown error");
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fetch, deps);

  return { data, loading, error, refetch: fetch };
}

// ---------------------------------------------------------------------------
// Existing hooks
// ---------------------------------------------------------------------------

export function useDiscoverMetadata() {
  return useQuery(getDiscoverMetadata, []);
}

export function usePractitioners(filters?: {
  discipline?: string;
  search?: string;
  videoAvailable?: boolean;
  under500?: boolean;
  today?: boolean;
  languages?: string[];
  sortBy?: string;
}) {
  return useQuery<Practitioner[]>(
    () => getPractitioners(filters),
    [
      filters?.discipline,
      filters?.search,
      filters?.videoAvailable,
      filters?.under500,
      filters?.today,
      JSON.stringify(filters?.languages),
      filters?.sortBy,
    ]
  );
}

export function usePractitioner(id: string | undefined) {
  return useQuery<Practitioner | null>(
    () => (id ? getPractitionerById(id) : Promise.resolve(null)),
    [id]
  );
}

export function useDinacharyaTasks(patientId: string | undefined) {
  return useQuery<DinacharTask[]>(
    () => (patientId ? getDinacharyaTasks(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function useHealthRecords(patientId: string | undefined) {
  return useQuery<HealthRecord[]>(
    () => (patientId ? getHealthRecords(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function useOrders(patientId: string | undefined) {
  return useQuery<Order[]>(
    () => (patientId ? getOrders(patientId) : Promise.resolve([])),
    [patientId]
  );
}

// ---------------------------------------------------------------------------
// New hooks — Patient Portal
// ---------------------------------------------------------------------------

export function useAppointments(patientId: string | undefined) {
  return useQuery<AppointmentRow[]>(
    () => (patientId ? getAppointments(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function useNotifications(userId: string | undefined) {
  return useQuery<NotificationRow[]>(
    () => (userId ? getNotifications(userId) : Promise.resolve([])),
    [userId]
  );
}

export function useFamilyMembers(patientId: string | undefined) {
  return useQuery<FamilyMemberRow[]>(
    () => (patientId ? getFamilyMembers(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function usePatientProfile(userId: string | undefined) {
  return useQuery<PatientProfile | null>(
    () => (userId ? getPatientProfile(userId) : Promise.resolve(null)),
    [userId]
  );
}

export function usePatientPrescriptions(patientId: string | undefined) {
  return useQuery<PrescriptionView[]>(
    () => (patientId ? getPatientPrescriptions(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function useConsentGrants(patientId: string | undefined) {
  return useQuery<ConsentView[]>(
    () => (patientId ? getConsentGrants(patientId) : Promise.resolve([])),
    [patientId]
  );
}

export function useReviews(practId: string | undefined) {
  return useQuery<ReviewRow[]>(
    () => (practId ? getPractitionerReviews(practId) : Promise.resolve([])),
    [practId]
  );
}

// ---------------------------------------------------------------------------
// New hooks — Pro (Practitioner) Portal
// ---------------------------------------------------------------------------

export function usePractitionerSchedules(practId: string | undefined) {
  return useQuery<ScheduleRow[]>(
    () => (practId ? getPractitionerSchedules(practId) : Promise.resolve([])),
    [practId]
  );
}

export function useBlockedDates(practId: string | undefined) {
  return useQuery<{ id: string; date: string; reason: string }[]>(
    () => (practId ? getBlockedDates(practId) : Promise.resolve([])),
    [practId]
  );
}

export function usePractitionerFollowUps(practId: string | undefined) {
  return useQuery<FollowUpRow[]>(
    () => (practId ? getPractitionerFollowUps(practId) : Promise.resolve([])),
    [practId]
  );
}

export function usePractitionerPrescriptions(practId: string | undefined) {
  return useQuery<PrescriptionView[]>(
    () => (practId ? getPractitionerPrescriptions(practId) : Promise.resolve([])),
    [practId]
  );
}

export function usePractitionerInbox(practId: string | undefined) {
  return useQuery<InboxThread[]>(
    () => (practId ? getPractitionerInbox(practId) : Promise.resolve([])),
    [practId]
  );
}

export function usePractitionerAnalytics(practId: string | undefined) {
  return useQuery<AnalyticsData | null>(
    () => (practId ? getPractitionerAnalytics(practId) : Promise.resolve(null)),
    [practId]
  );
}

export function useMedicines(search?: string) {
  return useQuery<MedicineRow[]>(
    () => getMedicines(search),
    [search]
  );
}

// ---------------------------------------------------------------------------
// New hooks — Admin
// ---------------------------------------------------------------------------

export function useAdminDashboard() {
  return useQuery(() => getAdminDashboardStats(), []);
}

export function useAdminPractitioners() {
  return useQuery(() => getAdminPractitioners(), []);
}

export function useAdminPatients() {
  return useQuery(() => getAdminPatients(), []);
}

export function useAdminOrders() {
  return useQuery(() => getAdminOrders(), []);
}

export function useAdminMedicines() {
  return useQuery<MedicineRow[]>(() => getAdminMedicines(), []);
}

export function useAdminClinics() {
  return useQuery(() => getAdminClinics(), []);
}

export function usePractitionerSlots(practitionerId: string | undefined, date: string) {
  return useQuery<SlotView[]>(
    () => (practitionerId && date ? getPractitionerSlots(practitionerId, date) : Promise.resolve([])),
    [practitionerId, date]
  );
}

export function usePractitionerAvailableDates(practitionerId: string | undefined) {
  return useQuery<string[]>(
    () => (practitionerId ? getPractitionerAvailableDates(practitionerId) : Promise.resolve([])),
    [practitionerId]
  );
}

export function useBoundedMessages(consultationId: string | undefined) {
  return useQuery(() => getBoundedMessages(consultationId || ""), [consultationId]);
}

export function usePractitionerQueue(practitionerId: string | undefined) {
  return useQuery(() => getPractitionerQueue(practitionerId || ""), [practitionerId]);
}

export function usePractitionerUpcomingAppointments(practitionerId: string | undefined) {
  return useQuery(() => getPractitionerUpcomingAppointments(practitionerId || ""), [practitionerId]);
}

export function usePatientIntakeDetails(patientId: string) {
  return useQuery(() => getPatientIntakeDetails(patientId), [patientId]);
}

export function useNewDoctorVerificationQueue() {
  return useQuery(() => getNewDoctorVerificationQueue(), []);
}

export function useNewDoctorProfile(userId: string | undefined) {
  return useQuery(
    () => (userId ? getDoctorProfileByUserId(userId) : Promise.resolve(null)),
    [userId]
  );
}

export function useNewPatientProfile(userId: string | undefined) {
  return useQuery(
    () => (userId ? getPatientProfileByUserId(userId) : Promise.resolve(null)),
    [userId]
  );
}

export function useNewDiscoverDoctors(filters?: {
  specialty?: string;
  language?: string;
  mode?: "video" | "clinic";
  city?: string;
  ratingMin?: number;
  feeMax?: number;
  search?: string;
}) {
  return useQuery(() => getDiscoverDoctors(filters), [JSON.stringify(filters)]);
}

export function useNewDoctorSlots(doctorId: string | undefined, date: string) {
  return useQuery(
    () => (doctorId && date ? getDoctorSlotsFromTemplates(doctorId, date) : Promise.resolve([])),
    [doctorId, date]
  );
}

export function useNewDoctorAvailableDates(doctorId: string | undefined) {
  return useQuery<string[]>(
    () => (doctorId ? getNewDoctorAvailableDates(doctorId) : Promise.resolve([])),
    [doctorId]
  );
}
