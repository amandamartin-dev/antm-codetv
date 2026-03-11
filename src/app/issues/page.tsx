import Link from "next/link";
import { IssueForm } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function IssuesPage() {
  const user = await requireAppUser();

  const [issues, teams, projects, labels] = await Promise.all([
    prisma.issue.findMany({
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
    prisma.team.findMany({ orderBy: { key: "asc" } }),
    prisma.project.findMany({ orderBy: { key: "asc" } }),
    prisma.label.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PageShell title="Issues" subtitle="Create, assign, and track dependencies">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <IssueForm
            mode="create"
            teams={teams}
            projects={projects}
            labels={labels}
            defaultValues={{
              teamId: teams[0]?.id,
              assigneeUserId: user.id,
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Issue List</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {issues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/issues/${issue.key}`}
                        className="font-medium hover:underline"
                      >
                        {issue.key} · {issue.title}
                      </Link>
                      <Badge variant="secondary">{issue.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Team {issue.team.key}
                      {issue.project ? ` · Project ${issue.project.key}` : ""}
                      {issue.assignee ? ` · ${issue.assignee.name}` : ""}
                    </p>
                  </li>
                ))}
                {issues.length === 0 && (
                  <li className="text-sm text-muted-foreground">No issues yet</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
