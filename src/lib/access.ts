import { Prisma, Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function teamAccessWhere(user: Pick<User, "id" | "role">): Prisma.TeamWhereInput {
  if (user.role === Role.ADMIN) {
    return {};
  }

  return {
    members: {
      some: {
        userId: user.id,
      },
    },
  };
}

export function projectAccessWhere(user: Pick<User, "id" | "role">): Prisma.ProjectWhereInput {
  if (user.role === Role.ADMIN) {
    return {};
  }

  return {
    OR: [
      {
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      {
        leadUserId: user.id,
      },
    ],
  };
}

export function issueAccessWhere(user: Pick<User, "id" | "role">): Prisma.IssueWhereInput {
  if (user.role === Role.ADMIN) {
    return {};
  }

  return {
    OR: [
      {
        assigneeUserId: user.id,
      },
      {
        team: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
      {
        project: {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    ],
  };
}

export async function assertTeamAccess(user: Pick<User, "id" | "role">, teamId: string) {
  if (user.role === Role.ADMIN) {
    return;
  }

  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!member) {
    throw new AuthorizationError();
  }
}

export async function assertProjectAccess(user: Pick<User, "id" | "role">, projectId: string) {
  if (user.role === Role.ADMIN) {
    return;
  }

  const canAccess = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          leadUserId: user.id,
        },
        {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!canAccess) {
    throw new AuthorizationError();
  }
}

export async function assertIssueAccess(user: Pick<User, "id" | "role">, issueId: string) {
  if (user.role === Role.ADMIN) {
    return;
  }

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      assigneeUserId: true,
      team: {
        select: {
          members: {
            where: { userId: user.id },
            select: { id: true },
          },
        },
      },
      project: {
        select: {
          members: {
            where: { userId: user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  const hasTeamMembership = Boolean(issue?.team.members[0]);
  const hasProjectMembership = Boolean(issue?.project?.members[0]);

  if (!issue || (!hasTeamMembership && !hasProjectMembership && issue.assigneeUserId !== user.id)) {
    throw new AuthorizationError();
  }
}
