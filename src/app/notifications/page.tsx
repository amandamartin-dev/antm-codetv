import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NotificationsPage() {
  const user = await requireAppUser();

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <PageShell title="Notifications" subtitle="In-app inbox only">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <ApiJsonForm
            endpoint="/api/notifications"
            method="PATCH"
            title="Mark All Read"
            submitLabel="Apply"
            defaultPayload={JSON.stringify({ action: "all-read" }, null, 2)}
          />
          <ApiJsonForm
            endpoint="/api/notifications"
            method="PATCH"
            title="Toggle One Notification"
            submitLabel="Apply"
            defaultPayload={JSON.stringify(
              {
                action: "read",
                notificationId: notifications[0]?.id ?? "",
              },
              null,
              2,
            )}
          />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Inbox</h2>
          <ul className="mt-3 space-y-2">
            {notifications.map((notification) => (
              <li key={notification.id} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{notification.title}</p>
                <p className="text-slate-600">{notification.body}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {notification.readAt ? "Read" : "Unread"} • {new Date(notification.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {notifications.length === 0 ? <li className="text-sm text-slate-500">No notifications</li> : null}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
