import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function unauthorized() {
  return jsonError(401, "Unauthorized");
}

export function forbidden() {
  return jsonError(403, "Forbidden");
}

export async function parseBody<T>(request: Request, schema: ZodSchema<T>) {
  const payload = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      error: jsonError(400, "Invalid request body", parsed.error.flatten()),
    };
  }

  return { data: parsed.data };
}
