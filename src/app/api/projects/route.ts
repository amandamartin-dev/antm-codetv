import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { projectAccessWhere } from "@/lib/access";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createProjectSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);

    const projects = await prisma.project.findMany({
      where: projectAccessWhere(user),
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
        _count: {
          select: {
            issues: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: projects });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser(request);

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    const parsed = await parseBody(request, createProjectSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const project = await prisma.project.create({
      data: {
        key: parsed.data.key,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        leadUserId: parsed.data.leadUserId ?? null,
        members:
          parsed.data.memberIds && parsed.data.memberIds.length > 0
            ? {
                createMany: {
                  data: parsed.data.memberIds.map((userId) => ({ userId })),
                  skipDuplicates: true,
                },
              }
            : undefined,
      },
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
