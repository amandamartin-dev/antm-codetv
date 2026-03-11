import { auth, currentUser } from "@clerk/nextjs/server";
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

function deriveProfileFromUser(
  clerkUserId: string,
  profile?: {
    email?: string | null;
    username?: string | null;
    githubUsername?: string | null;
    fullName?: string | null;
  },
) {
  const claimEmail = profile?.email;
  const claimUsername = profile?.username ?? profile?.githubUsername;
  const claimName = profile?.fullName;

  const email =
    typeof claimEmail === "string" && claimEmail.length > 0
      ? claimEmail
      : `${clerkUserId}@local.test`;
  const name =
    typeof claimUsername === "string" && claimUsername.length > 0
      ? claimUsername
      : typeof claimName === "string" && claimName.length > 0
        ? claimName
        : clerkUserId;

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
      const backendUser = await currentUser();
      const primaryEmail = backendUser?.primaryEmailAddress?.emailAddress;
      const githubAccount = backendUser?.externalAccounts?.find((account) => account.provider === "oauth_github");
      const profile = deriveProfileFromUser(clerkUserId, {
        email: primaryEmail,
        username: backendUser?.username,
        githubUsername: githubAccount?.username,
        fullName: backendUser?.fullName,
      });
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
    if ((email && existingUser.email !== email) || (name && existingUser.name !== name)) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: email ?? existingUser.email,
          name: name ?? existingUser.name,
        },
      });
    }

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
