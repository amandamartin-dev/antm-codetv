import Link from "next/link";
import { ProjectForm } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { projectAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProjectsPage() {
  const user = await requireAppUser();

  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      where: projectAccessWhere(user),
      include: {
        lead: {
          select: { id: true, name: true },
        },
        _count: {
          select: { issues: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PageShell title="Projects" subtitle="Track project scope, members, and releases">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ProjectForm mode="create" users={users} currentUserId={user.id} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project List</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {projects.map((project) => (
                  <li key={project.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/projects/${project.key}`}
                        className="font-medium hover:underline"
                      >
                        {project.key} · {project.name}
                      </Link>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Lead: {project.lead?.name ?? "Unassigned"} · Issues: {project._count.issues}
                    </p>
                  </li>
                ))}
                {projects.length === 0 && (
                  <li className="text-sm text-muted-foreground">No projects yet</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
