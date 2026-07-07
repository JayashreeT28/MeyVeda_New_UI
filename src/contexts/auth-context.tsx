"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "patient" | "practitioner";

export interface AuthUser {
  id?: string;
  phone: string;
  role: UserRole;
  name: string;
  abhaLinked: boolean;
  email?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "mv_user";
const COOKIE_NAME = "mv_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

import { createClient } from "@/lib/supabase";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore corrupt storage
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    const cookiePayload = btoa(JSON.stringify({ role: userData.role, phone: userData.phone }));
    setCookie(cookiePayload);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearCookie();
    router.push("/onboarding");
  }, [router]);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const cookiePayload = btoa(JSON.stringify({ role: updated.role, phone: updated.phone }));
      setCookie(cookiePayload);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (user && user.id && user.name === "Verified User") {
      const supabase = createClient();
      (async () => {
        let realName = "";
        if (user.role === "practitioner") {
          const { data: legacyDoc } = await supabase
            .from("practitioners")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (legacyDoc) {
            realName = legacyDoc.full_name;
          } else {
            const { data: doc } = await supabase
              .from("doctor_profiles")
              .select("full_name")
              .eq("user_id", user.id)
              .maybeSingle();
            if (doc) realName = doc.full_name;
          }
        } else if (user.role === "patient") {
          const { data: legacyPat } = await supabase
            .from("patients")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (legacyPat) {
            realName = legacyPat.full_name;
          } else {
            const { data: pat } = await supabase
              .from("patient_profiles")
              .select("full_name")
              .eq("user_id", user.id)
              .maybeSingle();
            if (pat) realName = pat.full_name;
          }
        }
        if (realName && realName !== "Verified User") {
          updateUser({ name: realName });
        }
      })();
    }
  }, [user, updateUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
