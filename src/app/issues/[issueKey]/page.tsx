import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { issueAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ issueKey: string }>;

export default async function IssueDetailPage({ params }: { params: Params }) {
  const { issueKey } = await params;
  const user = await requireAppUser();

  const issue = await prisma.issue.findFirst({
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
  });

  if (!issue) {
    notFound();
  }

  return (
    <PageShell title={issue.key} subtitle={issue.title}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p><span className="font-semibold">Status:</span> {issue.status}</p>
            <p><span className="font-semibold">Priority:</span> {issue.priority}</p>
            <p><span className="font-semibold">Team:</span> {issue.team.key}</p>
            <p>
              <span className="font-semibold">Project:</span>{" "}
              {issue.project ? <Link href={`/projects/${issue.project.key}`} className="underline">{issue.project.key}</Link> : "None"}
            </p>
            <p><span className="font-semibold">Assignee:</span> {issue.assignee?.name ?? "Unassigned"}</p>
          </div>

          <ApiJsonForm
            endpoint={`/api/issues/${issue.id}`}
            method="PATCH"
            title="Update Issue"
            submitLabel="Update"
            defaultPayload={JSON.stringify(
              {
                title: issue.title,
                description: issue.description,
                status: issue.status,
                priority: issue.priority,
                dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
                assigneeUserId: issue.assigneeUserId,
                labelId: issue.labelId,
                projectId: issue.projectId,
                teamId: issue.teamId,
              },
              null,
              2,
            )}
          />

          <ApiJsonForm
            endpoint={`/api/issues/${issue.id}/dependencies`}
            title="Add Dependency"
            submitLabel="Add"
            defaultPayload={JSON.stringify({ blockedByIssueId: issue.id }, null, 2)}
          />

          <ApiJsonForm
            endpoint={`/api/issues/${issue.id}/comments`}
            title="Add Comment"
            submitLabel="Comment"
            defaultPayload={JSON.stringify(
              {
                body: "Reference #ENG-1 and ~CORE-PLATFORM and @admin",
              },
              null,
              2,
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Description</h2>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{issue.description || "No description"}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Blocked By</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {issue.dependencies.map((edge) => (
                <li key={edge.id} className="rounded border border-slate-200 p-2">
                  <Link href={`/issues/${edge.blockedByIssue.key}`} className="font-medium underline">
                    {edge.blockedByIssue.key}
                  </Link>{" "}
                  {edge.blockedByIssue.title}
                </li>
              ))}
              {issue.dependencies.length === 0 ? <li className="text-slate-500">No blockers</li> : null}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Comments</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {issue.comments.map((comment) => (
                <li key={comment.id} className="rounded border border-slate-200 p-2">
                  <p className="font-medium text-slate-900">{comment.author.name}</p>
                  <p className="whitespace-pre-wrap text-slate-700">{comment.body}</p>
                </li>
              ))}
              {issue.comments.length === 0 ? <li className="text-slate-500">No comments</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
