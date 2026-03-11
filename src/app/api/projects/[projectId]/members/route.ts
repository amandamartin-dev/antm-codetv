import { NextResponse } from "next/server";
import { assertProjectAccess } from "@/lib/access";
import { requireAppUser, resolveUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { addMemberSchema } from "@/lib/validators";

type Params = Promise<{ projectId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

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

    const membership = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: resolvedUserId,
        },
      },
      create: {
        projectId,
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
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

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

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: resolvedUserId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
