import { ApiJsonForm } from "@/components/api-json-form";
import { PageShell } from "@/components/page-shell";
import { requireAppUser } from "@/lib/auth";
import { teamAccessWhere } from "@/lib/access";
import { prisma } from "@/lib/db";

export default async function TeamsPage() {
  const user = await requireAppUser();

  const teams = await prisma.team.findMany({
    where: teamAccessWhere(user),
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: {
          issues: true,
        },
      },
    },
    orderBy: {
      key: "asc",
    },
  });

  return (
    <PageShell title="Teams" subtitle="Team scope and membership">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ApiJsonForm
            endpoint="/api/teams"
            title="Create Team"
            submitLabel="Create"
            defaultPayload={JSON.stringify({ key: "NEW", name: "New Team" }, null, 2)}
          />
        </div>
        <div className="space-y-3 lg:col-span-2">
          {teams.map((team) => (
            <section key={team.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {team.key} · {team.name}
                </h2>
                <span className="text-sm text-slate-600">{team._count.issues} issues</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {team.members.map((member) => (
                  <li key={member.id}>{member.user.name}</li>
                ))}
              </ul>
              <div className="mt-3">
                <ApiJsonForm
                  endpoint={`/api/teams/${team.id}/members`}
                  title="Add Member"
                  submitLabel="Add"
                  defaultPayload={JSON.stringify({ userId: user.id }, null, 2)}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
