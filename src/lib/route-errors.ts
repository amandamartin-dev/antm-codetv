import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/auth";
import { AuthorizationError } from "@/lib/access";
import { MentionResolutionError } from "@/lib/mentions";

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof MentionResolutionError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  // Handle Prisma unique constraint violations
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      // Unique constraint violation
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target[0] : target || "field";
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      // Record not found
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }
  }

  if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
