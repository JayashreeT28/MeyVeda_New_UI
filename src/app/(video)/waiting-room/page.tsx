"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const CHECKS = [
  { id: "mic", label: "Microphone", status: "ok" as const },
  { id: "cam", label: "Camera", status: "ok" as const },
  { id: "net", label: "Network", status: "ok" as const },
  { id: "audio", label: "Audio Output", status: "ok" as const },
];

export default function WaitingRoomPage() {
  const { user } = useAuth();
  const displayName = user?.name ?? "You";
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const [secondsLeft, setSecondsLeft] = useState(8 * 60 + 43);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href="/discover">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </Link>
          <h1 className="font-semibold text-foreground">Waiting Room</h1>
          <div className="ml-auto flex items-center gap-1.5 bg-herb-green/10 border border-herb-green/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-herb-green animate-pulse" />
            <span className="text-xs text-herb-green font-medium">Encrypted</span>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Left: Main content */}
          <div className="space-y-5">
            {/* Doctor card + countdown */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-herb-gradient flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-xl font-bold font-display">AS</span>
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold text-foreground">Dr. Aditi Shastri</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Ayurveda · Panchakarma Specialist</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-2 h-2 rounded-full bg-herb-green animate-pulse" />
                    <span className="text-xs text-herb-green font-medium">In previous session — joining shortly</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 bg-herb-green/5 border border-herb-green/20 rounded-xl p-5 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  Session begins in
                </p>
                <p className="font-display text-5xl font-bold text-herb-green tabular-nums">
                  {minutes}:{seconds}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Please stay on this screen</p>
              </div>
            </div>

            {/* Camera preview */}
            <div className="bg-clinical-dark rounded-2xl overflow-hidden relative" style={{ aspectRatio: "16/9" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-herb-green/20 to-clinical-dark flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-herb-gradient flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold font-display">{initials}</span>
                  </div>
                  <p className="text-white text-sm font-medium">Camera Preview</p>
                  <p className="text-white/50 text-xs mt-0.5">Check your lighting & position</p>
                </div>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-white text-[10px] font-medium">{displayName} — You</span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground text-sm mb-3">Before Your Session</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: "💡", text: "Ensure good lighting — face a window if possible" },
                  { icon: "🔇", text: "Find a quiet, private space for your consultation" },
                  { icon: "📱", text: "Keep your device fully charged or plugged in" },
                  { icon: "📋", text: "Have your previous reports and medicines nearby" },
                ].map((g) => (
                  <div key={g.text} className="flex items-start gap-3 p-3 bg-background rounded-xl border border-border">
                    <span className="text-lg flex-shrink-0">{g.icon}</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{g.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: System checks + upload */}
          <div className="space-y-4">
            {/* System checks */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">System Check</h3>
              <div className="space-y-2">
                {CHECKS.map((check) => (
                  <div key={check.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-foreground">{check.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-herb-green" />
                      <span className="text-xs text-herb-green font-medium">Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report upload */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="font-semibold text-foreground text-sm mb-2">Upload Reports</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Share lab reports or health records with Dr. Shastri before the session.
              </p>
              <button
                onClick={() => setUploading(true)}
                className={cn(
                  "w-full py-2.5 text-sm font-medium rounded-xl border transition-all",
                  uploading ? "bg-herb-green/10 border-herb-green/30 text-herb-green" : "border-border text-muted-foreground hover:border-herb-green/40"
                )}
              >
                {uploading ? "✓ Uploading…" : "📎 Choose File"}
              </button>
            </div>

            {/* Join CTA */}
            <Link href="/consult">
              <button className="w-full py-4 bg-herb-green text-white rounded-2xl text-base font-semibold hover:bg-herb-green/90 transition-all active:scale-95 shadow-md">
                📹 Join Consultation
              </button>
            </Link>

            <p className="text-[10px] text-muted-foreground text-center">
              Joining early? You&apos;ll enter the secure waiting room until Dr. Shastri is ready.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
