import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { assertTeamAccess } from "@/lib/access";
import { requireAppUser, resolveUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { addMemberSchema } from "@/lib/validators";

type Params = Promise<{ teamId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const user = await requireAppUser(request);
    const { teamId } = await params;
    await assertTeamAccess(user, teamId);

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const user = await requireAppUser(request);
    const { teamId } = await params;

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    const parsed = await parseBody(request, addMemberSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const resolvedUserId = await resolveUserId({
      userId: parsed.data.userId,
      clerkUserId: parsed.data.clerkUserId,
    });

    if (!resolvedUserId) {
      throw new Error("User is required");
    }

    const membership = await prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId,
          userId: resolvedUserId,
        },
      },
      create: {
        teamId,
        userId: resolvedUserId,
      },
      update: {},
    });

    return NextResponse.json({ data: membership }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const user = await requireAppUser(request);
    const { teamId } = await params;

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    const parsed = await parseBody(request, addMemberSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const resolvedUserId = await resolveUserId({
      userId: parsed.data.userId,
      clerkUserId: parsed.data.clerkUserId,
    });

    if (!resolvedUserId) {
      throw new Error("User is required");
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: resolvedUserId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
