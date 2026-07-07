"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Search, Bell, Settings, Menu } from "lucide-react";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-border/50 h-16 flex items-center justify-between px-6 gap-4 transition-all duration-300">
      {/* Left: Mobile Trigger & Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-neutral-100 active:scale-95 transition-all text-neutral-600 flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <Link href="/" className="flex-shrink-0">
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="text-herb-green">Mey</span>
            <span className="text-copper">Veda</span>
          </span>
        </Link>
      </div>

      {/* Center: Search Bar (Desktop) */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative group">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-herb-green transition-colors"
          />
          <input
            type="text"
            placeholder="Search practitioners, records, health plans..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/50 rounded-2xl text-xs font-medium placeholder:text-muted-foreground/75 focus:outline-none focus:border-herb-green/50 focus:bg-white focus:ring-4 focus:ring-herb-green/5 transition-all duration-200 text-foreground"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Mobile Search Button */}
        <button className="sm:hidden p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all active:scale-95">
          <Search size={18} />
        </button>

        {/* Notifications */}
        <Link href="/notifications">
          <button className="relative p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all active:scale-95">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-copper border border-white animate-pulse" />
          </button>
        </Link>

        {/* Settings */}
        <Link href="/profile?tab=settings">
          <button className="p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all active:scale-95">
            <Settings size={18} />
          </button>
        </Link>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-neutral-200/60 mx-1 hidden sm:block" />

        {/* User profile avatar */}
        <Link href="/profile">
          <div className="w-8.5 h-8.5 rounded-full bg-herb-gradient flex items-center justify-center cursor-pointer shadow-xs border border-white/20 transition-transform hover:scale-105 active:scale-95">
            <span className="text-white text-xs font-bold font-display">{initials}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
