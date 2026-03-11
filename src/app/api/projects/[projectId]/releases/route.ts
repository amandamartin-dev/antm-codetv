import { NextResponse } from "next/server";
import { assertProjectAccess } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import {
  createReleaseSchema,
  deleteReleaseSchema,
  updateReleaseSchema,
} from "@/lib/validators";

type Params = Promise<{ projectId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const releases = await prisma.release.findMany({
      where: { projectId },
      orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: releases });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, createReleaseSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const release = await prisma.release.create({
      data: {
        projectId,
        name: parsed.data.name,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    });

    return NextResponse.json({ data: release }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, updateReleaseSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const release = await prisma.release.update({
      where: { id: parsed.data.releaseId, projectId },
      data: {
        name: parsed.data.name,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    });

    return NextResponse.json({ data: release });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, deleteReleaseSchema);
    if (parsed.error) {
      return parsed.error;
    }

    await prisma.release.delete({
      where: {
        id: parsed.data.releaseId,
        projectId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
