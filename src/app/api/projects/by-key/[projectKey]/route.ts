import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/route-errors";

type Params = Promise<{ projectKey: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { projectKey } = await params;
    await requireAppUser(request);

    const project = await prisma.project.findUnique({
      where: { key: projectKey.toUpperCase() },
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
              select: { id: true, name: true, email: true },
            },
            team: {
              select: { id: true, key: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
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
