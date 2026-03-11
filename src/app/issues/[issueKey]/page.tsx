import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueForm, CommentForm, DependencyForm } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { issueAccessWhere, projectAccessWhere, teamAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ issueKey: string }>;

export default async function IssueDetailPage({ params }: { params: Params }) {
  const { issueKey } = await params;
  const user = await requireAppUser();

  const [issue, teams, projects, labels, allIssues, users] = await Promise.all([
    prisma.issue.findFirst({
      where: {
        key: issueKey.toUpperCase(),
        AND: [issueAccessWhere(user)],
      },
      include: {
        team: true,
        project: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
        label: true,
        dependencies: {
          include: {
            blockedByIssue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
        blockedBy: {
          include: {
            issue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    }),
    prisma.team.findMany({ where: teamAccessWhere(user), orderBy: { key: "asc" } }),
    prisma.project.findMany({ where: projectAccessWhere(user), orderBy: { key: "asc" } }),
    prisma.label.findMany({ orderBy: { name: "asc" } }),
    prisma.issue.findMany({
      where: issueAccessWhere(user),
      select: { id: true, key: true, title: true },
      orderBy: { key: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!issue) {
    notFound();
  }

  return (
    <PageShell title={issue.key} subtitle={issue.title}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{issue.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <Badge variant="outline">{issue.priority}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team</span>
                <span>{issue.team.key}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                {issue.project ? (
                  <Link href={`/projects/${issue.project.key}`} className="hover:underline">
                    {issue.project.key}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignee</span>
                <span>{issue.assignee?.name ?? "Unassigned"}</span>
              </div>
              {issue.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{new Date(issue.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <IssueForm
            mode="edit"
            issueId={issue.id}
            teams={teams}
            projects={projects}
            labels={labels}
            users={users}
            defaultValues={{
              title: issue.title,
              description: issue.description ?? "",
              status: issue.status,
              priority: issue.priority,
              dueDate: issue.dueDate?.toISOString() ?? null,
              assigneeUserId: issue.assigneeUserId,
              labelId: issue.labelId,
              projectId: issue.projectId,
              teamId: issue.teamId,
            }}
          />

          <DependencyForm issueId={issue.id} availableIssues={allIssues} />

          <CommentForm endpoint={`/api/issues/${issue.id}/comments`} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {issue.description || "No description"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Blocked By</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {issue.dependencies.map((edge) => (
                  <li key={edge.id} className="rounded-lg border p-2 text-sm">
                    <Link
                      href={`/issues/${edge.blockedByIssue.key}`}
                      className="font-medium hover:underline"
                    >
                      {edge.blockedByIssue.key}
                    </Link>{" "}
                    {edge.blockedByIssue.title}
                    <Badge variant="secondary" className="ml-2">
                      {edge.blockedByIssue.status}
                    </Badge>
                  </li>
                ))}
                {issue.dependencies.length === 0 && (
                  <li className="text-sm text-muted-foreground">No blockers</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {issue.comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{comment.author.name}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.body}
                    </p>
                  </li>
                ))}
                {issue.comments.length === 0 && (
                  <li className="text-sm text-muted-foreground">No comments</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
