import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { assertTeamAccess } from "@/lib/access";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { updateTeamSchema } from "@/lib/validators";

type Params = Promise<{ teamId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { teamId } = await params;
    const user = await requireAppUser(request);
    await assertTeamAccess(user, teamId);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { teamId } = await params;
    const user = await requireAppUser(request);

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    const parsed = await parseBody(request, updateTeamSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: parsed.data,
    });

    return NextResponse.json({ data: team });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { teamId } = await params;
    const user = await requireAppUser(request);

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    await prisma.team.delete({ where: { id: teamId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
