import { NextResponse } from "next/server";
import { assertProjectAccess } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { updateProjectSchema } from "@/lib/validators";

type Params = Promise<{ projectId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
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
          orderBy: { startsAt: "asc" },
        },
        issues: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, updateProjectSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status,
        leadUserId: parsed.data.leadUserId,
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    await requireAppUser(request);

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
