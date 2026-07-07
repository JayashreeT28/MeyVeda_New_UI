"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/lib/hooks";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/queries";
import type { NotificationRow } from "@/lib/queries";

const TYPE_ICON: Record<string, string> = {
  appointment: "🗓️",
  prescription: "📋",
  medicine: "💊",
  dinacharya: "🌅",
  ai_chat: "✨",
  payment: "💳",
  general: "🔔",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: notifications, loading, refetch } = useNotifications(user?.id);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const allNotifs = notifications ?? [];
  const unreadCount = allNotifs.filter((n) => !n.isRead).length;
  const filtered = filter === "unread" ? allNotifs.filter((n) => !n.isRead) : allNotifs;

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    refetch();
  }

  async function handleMarkAllRead() {
    if (user?.id) {
      await markAllNotificationsRead(user.id);
      refetch();
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-herb-green font-semibold hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all",
              filter === f ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-herb-green/15 text-herb-green font-semibold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-4 h-20 animate-pulse">
              <div className="w-1/3 h-3 bg-muted rounded mb-2" />
              <div className="w-2/3 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <span className="text-4xl">🔔</span>
          <p className="font-semibold text-foreground mt-3">No notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "unread" ? "No unread notifications" : "You're all caught up!"}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((notif: NotificationRow) => (
            <button
              key={notif.id}
              onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              className={cn(
                "w-full text-left bg-white rounded-2xl border p-4 transition-all hover:shadow-sm",
                notif.isRead ? "border-border opacity-70" : "border-herb-green/20 bg-herb-green/2"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {TYPE_ICON[notif.type] ?? TYPE_ICON.general}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm font-semibold truncate", notif.isRead ? "text-muted-foreground" : "text-foreground")}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{notif.timeAgo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  {notif.deepLink && (
                    <Link href={notif.deepLink} className="text-[10px] text-herb-green font-medium mt-1 inline-block hover:underline">
                      View details →
                    </Link>
                  )}
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-herb-green flex-shrink-0 mt-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
