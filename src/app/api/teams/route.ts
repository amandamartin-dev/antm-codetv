import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createTeamSchema } from "@/lib/validators";
import { teamAccessWhere } from "@/lib/access";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);

    const teams = await prisma.team.findMany({
      where: teamAccessWhere(user),
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
    await requireAppUser(request);

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
