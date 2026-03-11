import Link from "next/link";
import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { issueAccessWhere, projectAccessWhere, teamAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function IssuesPage() {
  const user = await requireAppUser();

  const [issues, teams, projects, labels] = await Promise.all([
    prisma.issue.findMany({
      where: issueAccessWhere(user),
      include: {
        team: {
          select: { id: true, key: true, name: true },
        },
        project: {
          select: { id: true, key: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
        label: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.team.findMany({ where: teamAccessWhere(user), orderBy: { key: "asc" } }),
    prisma.project.findMany({ where: projectAccessWhere(user), orderBy: { key: "asc" } }),
    prisma.label.findMany({ orderBy: { name: "asc" } }),
  ]);

  const defaultCreatePayload = JSON.stringify(
    {
      title: "New issue",
      description: "",
      teamId: teams[0]?.id,
      projectId: projects[0]?.id ?? null,
      assigneeUserId: user.id,
      labelId: labels[0]?.id ?? null,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: null,
    },
    null,
    2,
  );

  return (
    <PageShell title="Issues" subtitle="Create, assign, and track dependencies">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ApiJsonForm
            endpoint="/api/issues"
            title="Create Issue"
            submitLabel="Create"
            defaultPayload={defaultCreatePayload}
          />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Issue List</h2>
          <ul className="mt-3 space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="rounded border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/issues/${issue.key}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                    {issue.key} · {issue.title}
                  </Link>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{issue.status}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Team {issue.team.key}
                  {issue.project ? ` · Project ${issue.project.key}` : ""}
                  {issue.assignee ? ` · Assignee ${issue.assignee.name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
