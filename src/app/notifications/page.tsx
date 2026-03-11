import { NotificationActions } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <NotificationActions notifications={notifications} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbox</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex flex-col gap-1 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{notification.title}</p>
                      <Badge variant={notification.readAt ? "secondary" : "default"}>
                        {notification.readAt ? "Read" : "Unread"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
                {notifications.length === 0 && (
                  <li className="text-sm text-muted-foreground">No notifications</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
