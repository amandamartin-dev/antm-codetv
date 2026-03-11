import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/route-errors";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);
    return NextResponse.json({
      data: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
