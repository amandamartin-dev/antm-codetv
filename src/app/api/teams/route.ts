import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createTeamSchema } from "@/lib/validators";

export async function GET() {
  try {
    // Show all teams to everyone
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ data: teams });
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

    const parsed = await parseBody(request, createTeamSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const team = await prisma.team.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
