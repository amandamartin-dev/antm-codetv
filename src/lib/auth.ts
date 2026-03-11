import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEV_AUTH_HEADER = "x-dev-user-id";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export function isClerkConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

function canUseDevBypass() {
  return process.env.ALLOW_DEV_BYPASS_AUTH === "1" || process.env.NODE_ENV !== "production";
}

function deriveProfileFromClaims(clerkUserId: string, claims?: Record<string, unknown>) {
  const claimEmail = claims?.email;
  const claimName = claims?.full_name ?? claims?.name;

  const email =
    typeof claimEmail === "string" && claimEmail.length > 0
      ? claimEmail
      : `${clerkUserId}@local.test`;
  const name =
    typeof claimName === "string" && claimName.length > 0 ? claimName : clerkUserId;

  return { email, name };
}

export async function requireAppUser(request?: Request): Promise<User> {
  let clerkUserId: string | null = null;
  let email: string | undefined;
  let name: string | undefined;

  if (isClerkConfigured()) {
    const session = await auth();
    clerkUserId = session.userId;

    if (clerkUserId) {
      const claims = session.sessionClaims as Record<string, unknown> | undefined;
      const profile = deriveProfileFromClaims(clerkUserId, claims);
      email = profile.email;
      name = profile.name;
    }
  }

  if (!clerkUserId && request && canUseDevBypass()) {
    const devUserId = request.headers.get(DEV_AUTH_HEADER);
    if (devUserId) {
      clerkUserId = devUserId;
      email = `${devUserId}@local.test`;
      name = devUserId;
    }
  }

  if (!clerkUserId && !request && canUseDevBypass()) {
    const headerStore = await headers();
    const devUserId = headerStore.get(DEV_AUTH_HEADER);
    if (devUserId) {
      clerkUserId = devUserId;
      email = `${devUserId}@local.test`;
      name = devUserId;
    }
  }

  if (!clerkUserId && canUseDevBypass()) {
    const fallbackUserId =
      process.env.DEV_DEFAULT_CLERK_USER_ID ?? process.env.SEED_DEFAULT_CLERK_USER_ID;
    if (fallbackUserId) {
      clerkUserId = fallbackUserId;
      email = `${fallbackUserId}@local.test`;
      name = fallbackUserId;
    }
  }

  if (!clerkUserId) {
    throw new AuthError();
  }

  const existingUser = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      clerkUserId,
      email: email ?? `${clerkUserId}@local.test`,
      name: name ?? clerkUserId,
      role: Role.MEMBER,
    },
  });
}

export async function resolveUserId(args: {
  userId?: string | null;
  clerkUserId?: string | null;
}) {
  if (args.userId) {
    return args.userId;
  }

  if (!args.clerkUserId) {
    return null;
  }

  const existing = await prisma.user.findUnique({
    where: {
      clerkUserId: args.clerkUserId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      clerkUserId: args.clerkUserId,
      email: `${args.clerkUserId}@local.test`,
      name: args.clerkUserId,
      role: Role.MEMBER,
    },
    select: {
      id: true,
    },
  });

  return created.id;
}
