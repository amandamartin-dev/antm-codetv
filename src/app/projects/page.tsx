import Link from "next/link";
import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProjectsPage() {
  const user = await requireAppUser();

  // Show ALL projects to everyone
  const projects = await prisma.project.findMany({
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
  });

  const defaultPayload = JSON.stringify(
    {
      key: "NEW-PROJECT",
      name: "New Project",
      description: "",
      status: "PLANNED",
      leadUserId: user.id,
      memberIds: [user.id],
    },
    null,
    2,
  );

  return (
    <PageShell title="Projects" subtitle="Track project scope, members, and releases">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ApiJsonForm
            endpoint="/api/projects"
            title="Create Project"
            submitLabel="Create"
            defaultPayload={defaultPayload}
          />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Project List</h2>
          <ul className="mt-3 space-y-2">
            {projects.map((project) => (
              <li key={project.id} className="rounded border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/projects/${project.key}`} className="font-semibold underline-offset-2 hover:underline">
                    {project.key} · {project.name}
                  </Link>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{project.status}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Lead: {project.lead?.name ?? "Unassigned"} · Issues: {project._count.issues}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
