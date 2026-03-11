import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { updateLabelSchema } from "@/lib/validators";

type Params = Promise<{ labelId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { labelId } = await params;
    const user = await requireAppUser(request);

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    const parsed = await parseBody(request, updateLabelSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const label = await prisma.label.update({
      where: { id: labelId },
      data: parsed.data,
    });

    return NextResponse.json({ data: label });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { labelId } = await params;
    const user = await requireAppUser(request);

    if (user.role !== Role.ADMIN) {
      throw new Error("Admin access required");
    }

    await prisma.label.delete({ where: { id: labelId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
