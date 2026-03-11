import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/route-errors";

export async function GET(request: Request) {
  try {
    const user = await requireAppUser(request);
    return NextResponse.json({ data: user });
  } catch (error) {
    return handleRouteError(error);
  }
}
