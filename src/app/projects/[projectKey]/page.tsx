import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectForm, ReleaseForm, CommentForm } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ projectKey: string }>;

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { projectKey } = await params;
  const user = await requireAppUser();

  const [project, users] = await Promise.all([
    prisma.project.findFirst({
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
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <PageShell title={project.key} subtitle={project.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{project.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead</span>
                <span>{project.lead?.name ?? "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Members</span>
                <span>{project.members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issues</span>
                <span>{project.issues.length}</span>
              </div>
            </CardContent>
          </Card>

          <ProjectForm
            mode="edit"
            projectId={project.id}
            users={users}
            currentUserId={user.id}
            defaultValues={{
              name: project.name,
              description: project.description,
              status: project.status,
              leadUserId: project.leadUserId,
            }}
          />

          <ReleaseForm projectId={project.id} />

          <CommentForm endpoint={`/api/projects/${project.id}/comments`} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">
                {project.description || "No description"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Releases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {project.releases.map((release) => (
                  <li key={release.id} className="rounded-lg border p-3">
                    <p className="font-medium">{release.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {release.startsAt
                        ? new Date(release.startsAt).toLocaleDateString()
                        : "No start"}{" "}
                      -{" "}
                      {release.endsAt
                        ? new Date(release.endsAt).toLocaleDateString()
                        : "No end"}
                    </p>
                  </li>
                ))}
                {project.releases.length === 0 && (
                  <li className="text-sm text-muted-foreground">No releases</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {project.issues.map((issue) => (
                  <li key={issue.id} className="rounded-lg border p-2 text-sm">
                    <Link
                      href={`/issues/${issue.key}`}
                      className="font-medium hover:underline"
                    >
                      {issue.key}
                    </Link>{" "}
                    {issue.title}
                  </li>
                ))}
                {project.issues.length === 0 && (
                  <li className="text-sm text-muted-foreground">No issues</li>
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
                {project.comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{comment.author.name}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {comment.body}
                    </p>
                  </li>
                ))}
                {project.comments.length === 0 && (
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
