"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export default function ConsultPage() {
  const { user } = useAuth();
  const isPractitioner = user?.role === "practitioner";
  const endCallHref = isPractitioner ? "/pro/emr" : "/post-consult";

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"emr" | "chat">("emr");
  const [duration, setDuration] = useState(742);

  useEffect(() => {
    const id = setInterval(() => setDuration((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const prescriptionItems = [
    { name: "Ashwagandha Churna", dose: "1 tsp", freq: "Twice daily", vehicle: "Warm milk" },
    { name: "Triphala Churna", dose: "1 tsp", freq: "At bedtime", vehicle: "Warm water" },
    { name: "Brahmi Ghrita", dose: "½ tsp", freq: "Morning", vehicle: "Before breakfast" },
  ];

  return (
    <div className="h-screen flex flex-col bg-clinical-dark overflow-hidden">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs font-mono">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-white text-[10px] font-medium">Encrypted</span>
        </div>
        <span className="text-white/70 text-xs">HD</span>
      </div>

      {/* Main video area — expands to fill */}
      <div className="flex-1 flex gap-3 px-3 min-h-0">
        {/* Doctor feed */}
        <div className="flex-1 relative">
          <div className="w-full h-full bg-gradient-to-br from-herb-green/40 to-clinical-dark rounded-2xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.19_0.025_158_/_0.8)] to-[oklch(0.29_0.09_158_/_0.4)]" />
            <div className="relative text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
                <span className="text-white text-2xl font-bold font-display">AS</span>
              </div>
              <p className="text-white font-semibold font-display">Dr. Aditi Shastri</p>
              <p className="text-white/60 text-xs mt-0.5">Ayurveda Specialist</p>
            </div>

            {/* Self PiP */}
            <div className="absolute top-3 right-3 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 bg-sage/30 backdrop-blur-sm">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center bg-clinical-dark/80">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5}>
                    <line x1="2" y1="2" x2="22" y2="22" />
                    <path d="M10.66 6H14a2 2 0 012 2v2.34l1 1L23 7v10M3.82 3.82A2 2 0 002 6v12a2 2 0 002 2h14a2 2 0 001.94-1.5" />
                  </svg>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-ivory to-sand flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-herb-gradient flex items-center justify-center">
                    <span className="text-white text-sm font-bold">R</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: EMR panel on right */}
        <div className="hidden lg:flex flex-col w-80 bg-white rounded-2xl overflow-hidden">
          <div className="flex gap-1 p-3 border-b border-border flex-shrink-0">
            {(["emr", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all",
                  activeTab === tab ? "bg-herb-green text-white" : "text-muted-foreground hover:text-foreground")}
              >
                {tab === "emr" ? "📋 Care Plan" : "💬 Chat"}
              </button>
            ))}
          </div>
          {activeTab === "emr" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prescribed Formulations</p>
              <div className="space-y-2">
                {prescriptionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-herb-green/4 rounded-lg">
                    <span className="text-sm mt-0.5">🌿</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.dose} · {item.freq} · with {item.vehicle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "chat" && (
            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-xs text-muted-foreground text-center">Secure message thread with Dr. Shastri</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4 px-6 flex-shrink-0">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", isMuted ? "bg-copper" : "bg-white/15")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round">
            {isMuted
              ? <><line x1="2" y1="2" x2="22" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0019 12v-2M5 10v2a7 7 0 007 7h0M15 9.34V5a3 3 0 00-5.94-.6M9 9v3a3 3 0 005.12 2.12" /></>
              : <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" /></>
            }
          </svg>
        </button>

        <button
          onClick={() => setShowEndDialog(true)}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
            <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07C9.44 16.29 7.71 14.56 6.46 12.62" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </button>

        <button
          onClick={() => setIsCameraOff(!isCameraOff)}
          className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", isCameraOff ? "bg-copper" : "bg-white/15")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>
      </div>

      {/* Mobile: EMR drawer at bottom */}
      <div className="lg:hidden bg-white rounded-t-3xl flex-shrink-0">
        <div className="flex gap-1 p-3 border-b border-border">
          {(["emr", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all",
                activeTab === tab ? "bg-herb-green text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {tab === "emr" ? "📋 Care Plan" : "💬 Chat"}
            </button>
          ))}
        </div>
        {activeTab === "emr" && (
          <div className="p-4 max-h-48 overflow-y-auto space-y-2">
            {prescriptionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-herb-green/4 rounded-lg">
                <span className="text-sm mt-0.5">🌿</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.dose} · {item.freq} · with {item.vehicle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === "chat" && (
          <div className="p-4 h-24 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">Secure message thread with Dr. Shastri</p>
          </div>
        )}
      </div>

      {/* End call dialog */}
      {showEndDialog && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-display font-semibold text-foreground text-center">End Consultation?</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Your prescription will be ready once Dr. Shastri finalises the session.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Stay
              </button>
              <Link href={endCallHref} className="flex-1">
                <button className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                  {isPractitioner ? "End & Open EMR" : "End Call"}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
