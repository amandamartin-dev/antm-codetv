"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckIcon, CheckCheckIcon } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  readAt: Date | null;
};

type NotificationActionsProps = {
  notifications: Notification[];
};

export function NotificationActions({ notifications }: NotificationActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markAllRead = async () => {
    setBusy("all");
    setStatus("");

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "all-read" }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(data.error ?? "Request failed");
      setBusy(null);
      return;
    }

    setStatus("All marked as read");
    setBusy(null);
    router.refresh();
  };

  const toggleRead = async (notificationId: string) => {
    setBusy(notificationId);
    setStatus("");

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", notificationId }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setStatus(data.error ?? "Request failed");
      setBusy(null);
      return;
    }

    setBusy(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
        <CardDescription>
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          onClick={markAllRead}
          disabled={busy !== null || unreadCount === 0}
          variant="outline"
          className="w-full justify-start"
        >
          <CheckCheckIcon className="mr-2 size-4" />
          {busy === "all" ? "Marking..." : "Mark all as read"}
        </Button>

        {notifications.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Toggle individual:
            </p>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {notifications.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleRead(n.id)}
                  disabled={busy !== null}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                >
                  <span
                    className={`size-2 rounded-full ${
                      n.readAt ? "bg-muted" : "bg-primary"
                    }`}
                  />
                  <span className="flex-1 truncate">{n.title}</span>
                  {busy === n.id && (
                    <CheckIcon className="size-3 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {status && <p className="text-xs text-muted-foreground">{status}</p>}
      </CardContent>
    </Card>
  );
}
