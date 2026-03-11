import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { updateLabelSchema } from "@/lib/validators";

type Params = Promise<{ labelId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { labelId } = await params;
    await requireAppUser(request);

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
    await requireAppUser(request);

    await prisma.label.delete({ where: { id: labelId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
