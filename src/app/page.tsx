import { DashboardCharts } from "@/components/dashboard-charts";
import { PageShell } from "@/components/page-shell";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  await requireAppUser();

  // Show ALL projects and issues to everyone
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      issues: {
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      key: "asc",
    },
  });

  const openVsCompleted = projects.map((project) => {
    const completed = project.issues.filter((issue) => issue.status === "DONE").length;
    const open = project.issues.length - completed;

    return {
      projectKey: project.key,
      open,
      completed,
      total: project.issues.length,
      progress: project.issues.length === 0 ? 0 : Math.round((completed / project.issues.length) * 100),
    };
  });

  // Show all notifications to everyone
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <PageShell title="Dashboard" subtitle="Workspace progress and inbox">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts openVsCompleted={openVsCompleted} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Project Progress</h2>
          <div className="mt-4 space-y-3">
            {openVsCompleted.map((item) => (
              <div key={item.projectKey} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{item.projectKey}</span>
                  <span className="text-slate-500">{item.progress}%</span>
                </div>
                <div className="h-2 rounded bg-slate-200">
                  <div
                    className="h-2 rounded bg-emerald-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
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
        </ul>
      </div>
    </PageShell>
  );
}
