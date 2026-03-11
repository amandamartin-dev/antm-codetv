import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { notificationPatchSchema } from "@/lib/validators";

export async function GET() {
  try {
    // Show all notifications to everyone
    const notifications = await prisma.notification.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: notifications });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAppUser(request);
    const parsed = await parseBody(request, notificationPatchSchema);

    if (parsed.error) {
      return parsed.error;
    }

    if (parsed.data.action === "all-read") {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (!parsed.data.notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: {
        id: parsed.data.notificationId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updated = await prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        readAt: parsed.data.action === "read" ? new Date() : null,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
