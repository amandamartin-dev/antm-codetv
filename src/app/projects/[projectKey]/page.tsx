import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { projectAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ projectKey: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { projectKey } = await params;
  const user = await requireAppUser();

  const project = await prisma.project.findFirst({
    where: {
      key: projectKey.toUpperCase(),
      AND: [projectAccessWhere(user)],
    },
    include: {
      lead: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      releases: {
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
      },
      issues: {
        include: {
          assignee: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      comments: {
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <PageShell title={project.key} subtitle={project.name}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p><span className="font-semibold">Status:</span> {project.status}</p>
            <p><span className="font-semibold">Lead:</span> {project.lead?.name ?? "Unassigned"}</p>
            <p><span className="font-semibold">Members:</span> {project.members.length}</p>
            <p><span className="font-semibold">Issues:</span> {project.issues.length}</p>
          </div>

          <ApiJsonForm
            endpoint={`/api/projects/${project.id}`}
            method="PATCH"
            title="Update Project"
            submitLabel="Update"
            defaultPayload={JSON.stringify(
              {
                name: project.name,
                description: project.description,
                status: project.status,
                leadUserId: project.leadUserId,
              },
              null,
              2,
            )}
          />

          <ApiJsonForm
            endpoint={`/api/projects/${project.id}/releases`}
            title="Add Release"
            submitLabel="Add"
            defaultPayload={JSON.stringify(
              {
                name: "vNext",
                startsAt: new Date().toISOString(),
                endsAt: null,
              },
              null,
              2,
            )}
          />

          <ApiJsonForm
            endpoint={`/api/projects/${project.id}/comments`}
            title="Add Comment"
            submitLabel="Comment"
            defaultPayload={JSON.stringify(
              {
                body: "Mention @admin and #ENG-1 in ~CORE-PLATFORM",
              },
              null,
              2,
            )}
          />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{project.description || "No description"}</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Releases</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {project.releases.map((release) => (
                <li key={release.id} className="rounded border border-slate-200 p-2">
                  <p className="font-medium text-slate-900">{release.name}</p>
                  <p className="text-slate-600">
                    {release.startsAt ? new Date(release.startsAt).toLocaleDateString() : "No start"} -{" "}
                    {release.endsAt ? new Date(release.endsAt).toLocaleDateString() : "No end"}
                  </p>
                </li>
              ))}
              {project.releases.length === 0 ? <li className="text-slate-500">No releases</li> : null}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Issues</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {project.issues.map((issue) => (
                <li key={issue.id} className="rounded border border-slate-200 p-2">
                  <Link href={`/issues/${issue.key}`} className="font-medium underline">
                    {issue.key}
                  </Link>{" "}
                  {issue.title}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Comments</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {project.comments.map((comment) => (
                <li key={comment.id} className="rounded border border-slate-200 p-2">
                  <p className="font-medium text-slate-900">{comment.author.name}</p>
                  <p className="whitespace-pre-wrap text-slate-700">{comment.body}</p>
                </li>
              ))}
              {project.comments.length === 0 ? <li className="text-slate-500">No comments</li> : null}
            </ul>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
