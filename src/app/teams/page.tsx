import { TeamForm, AddMemberForm } from "@/components/forms";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { teamAccessWhere } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function TeamsPage() {
  const user = await requireAppUser();

  const [teams, allUsers] = await Promise.all([
    prisma.team.findMany({
      where: teamAccessWhere(user),
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
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
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <PageShell title="Teams" subtitle="Team scope and membership">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TeamForm />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {team.key} · {team.name}
                  </CardTitle>
                  <Badge variant="secondary">{team._count.issues} issues</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Members</p>
                  <ul className="flex flex-col gap-1">
                    {team.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between text-sm">
                        <span>{member.user.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {member.user.role}
                        </Badge>
                      </li>
                    ))}
                    {team.members.length === 0 && (
                      <li className="text-sm text-muted-foreground">No members</li>
                    )}
                  </ul>
                </div>
                <AddMemberForm
                  teamId={team.id}
                  users={allUsers}
                  existingMemberIds={team.members.map((m) => m.user.id)}
                />
              </CardContent>
            </Card>
          ))}
          {teams.length === 0 && (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-sm text-muted-foreground">No teams yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
