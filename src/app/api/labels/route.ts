import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createLabelSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireAppUser(request);

    const labels = await prisma.label.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ data: labels });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAppUser(request);

    const parsed = await parseBody(request, createLabelSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const label = await prisma.label.create({
      data: parsed.data,
    });

    return NextResponse.json({ data: label }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
