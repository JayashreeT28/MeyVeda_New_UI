"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import {
  Home,
  Calendar,
  Search,
  Sparkles,
  Sun,
  Folder,
  Activity,
  MessageSquare,
  Bell,
  User,
  Crown,
  BarChart3,
  Edit,
  FileText,
  ClipboardList,
  TrendingUp,
  CalendarDays,
  ShieldCheck,
  HelpCircle,
  ChevronRight,
  LogOut
} from "lucide-react";
import React from "react";

type NavItem =
  | { 
      href: string; 
      icon: React.ComponentType<{ className?: string; size?: number }>; 
      label: string; 
      badge?: string; 
      exact?: boolean 
    }
  | "separator";

const PATIENT_NAV: NavItem[] = [
  { href: "/", icon: Home, label: "Home", exact: true },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/discover", icon: Search, label: "Discover" },
  { href: "/ai-chat", icon: Sparkles, label: "AyurSanvaad AI" },
  { href: "/dinacharya", icon: Sun, label: "Dinacharya" },
  { href: "/records", icon: Folder, label: "Health Records" },
  { href: "/apothecary", icon: Activity, label: "Apothecary" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications", badge: "3" },
  { href: "/profile", icon: User, label: "Profile" },
  "separator",
  { href: "/pro", icon: Crown, label: "MeyVeda Pro", badge: "Pro", exact: true },
];

const PRACTITIONER_NAV: NavItem[] = [
  { href: "/pro", icon: BarChart3, label: "Dashboard", exact: true },
  { href: "/pro/patients", icon: Search, label: "Patient Search" },
  { href: "/pro/prescribe", icon: Edit, label: "Write Rx" },
  { href: "/pro/emr", icon: FileText, label: "EMR Builder" },
  { href: "/ai-chat", icon: Sparkles, label: "Vaidya Sahayak AI" },
  { href: "/pro/follow-ups", icon: Bell, label: "Follow-ups", badge: "1" },
  { href: "/pro/inbox", icon: MessageSquare, label: "Inbox", badge: "1" },
  { href: "/pro/prescriptions", icon: ClipboardList, label: "Prescriptions" },
  { href: "/pro/analytics", icon: TrendingUp, label: "Analytics" },
  "separator",
  { href: "/pro/availability", icon: CalendarDays, label: "Availability" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

function isActive(pathname: string, item: Exclude<NavItem, "separator">): boolean {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isPractitioner = user?.role === "practitioner";
  const navItems = isPractitioner ? PRACTITIONER_NAV : PATIENT_NAV;

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-60 bg-white border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-xs",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-5 border-b border-border/60 flex-shrink-0">
          <Link href={isPractitioner ? "/pro" : "/"} onClick={onClose}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-herb-gradient flex items-center justify-center shadow-xs">
                <span className="text-white text-base font-bold font-display">M</span>
              </div>
              <div>
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  <span className="text-herb-green">Mey</span>
                  <span className="text-copper">Veda</span>
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                  {isPractitioner ? "Practitioner Portal · HPR" : "AYUSH Digital Health · ABDM"}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Scrollable Container (contains both Nav and Bottom widgets) */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {/* Nav */}
          <nav className="px-4 py-5 flex-1">
            {navItems.map((item, i) => {
              if (item === "separator") {
                return <div key={`sep-${i}`} className="my-3.5 h-px bg-border/50" />;
              }

              const active = isActive(pathname, item);
              const activeColor = isPractitioner ? "bg-copper/10 text-copper font-semibold" : "bg-herb-green/10 text-herb-green font-semibold";
              const activeIconColor = isPractitioner ? "text-copper" : "text-herb-green";
              const activeDotColor = isPractitioner ? "bg-copper" : "bg-herb-green";
              const badgeColor = isPractitioner ? "bg-copper/10 text-copper" : "bg-copper/10 text-copper";

              return (
                <Link key={item.href} href={item.href} onClick={onClose} className="group block">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium tracking-wide transition-all mb-1 select-none active:scale-[0.98]",
                      active 
                        ? activeColor 
                        : "text-muted-foreground/90 hover:bg-neutral-50 hover:text-foreground"
                    )}
                  >
                    <item.icon 
                      size={18} 
                      className={cn(
                        "flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                        active ? activeIconColor : "text-muted-foreground/60 group-hover:text-foreground"
                      )} 
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && !active && (
                      <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none", badgeColor)}>
                        {item.badge}
                      </span>
                    )}
                    {active && <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", activeDotColor)} />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Widgets - Premium widgets for Patient portal */}
          {!isPractitioner && (
            <div className="px-4 pb-5 pt-3.5 space-y-4 border-t border-neutral-100 flex-shrink-0">
              {/* MeyVeda Pro Widget */}
              <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-herb-green to-herb-green-light text-white shadow-xs border border-white/10 group hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5">
                    <Crown size={13} className="text-copper fill-copper animate-pulse" />
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-copper-light">MeyVeda Pro</span>
                  </div>
                  <h4 className="text-xs font-bold mt-1.5 text-white">Upgrade Care Plan</h4>
                  <p className="text-[10px] text-white/80 mt-1 leading-normal font-medium">
                    Unlock unlimited consults, priority scheduling & custom diet plans.
                  </p>
                  <Link href="/pro" className="mt-3.5 inline-flex items-center gap-1.5 bg-white hover:bg-neutral-50 text-herb-green text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs active:scale-95">
                    <span>Upgrade Now</span>
                    <ChevronRight size={10} />
                  </Link>
                </div>
              </div>

              {/* Need Help Widget */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/50 transition-all cursor-pointer group active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200/50 flex items-center justify-center shadow-xs">
                    <HelpCircle size={14} className="text-sage" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[11px] font-bold text-foreground leading-tight">Need Assistance?</h5>
                    <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Chat Support 24/7</p>
                  </div>
                </div>
                <ChevronRight size={12} className="text-muted-foreground/70 group-hover:translate-x-0.5 transition-transform mr-1" />
              </div>

              {/* Verified Secure Widget */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-800">
                <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold leading-tight">ABDM Verified</p>
                  <p className="text-[8px] text-emerald-700/85 truncate mt-0.5">100% Encrypted Health Records</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-border/60 bg-neutral-50/50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Link href="/profile" onClick={onClose} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-85 transition-opacity cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-herb-gradient flex items-center justify-center flex-shrink-0 shadow-xs">
                <span className="text-white text-xs font-bold font-display">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{user?.name ?? "Guest"}</p>
                <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">
                  {user?.abhaLinked ? "ABHA Linked · ABDM ✓" : `+91 ${user?.phone ?? "—"}`}
                </p>
              </div>
            </Link>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 active:scale-95"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
