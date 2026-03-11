import { Prisma, User } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function teamAccessWhere(user: Pick<User, "id" | "role">): Prisma.TeamWhereInput {
  void user;
  return {};
}

export function projectAccessWhere(user: Pick<User, "id" | "role">): Prisma.ProjectWhereInput {
  void user;
  return {};
}

export function issueAccessWhere(user: Pick<User, "id" | "role">): Prisma.IssueWhereInput {
  void user;
  return {};
}

export async function assertTeamAccess(user: Pick<User, "id" | "role">, teamId: string) {
  void user;
  void teamId;
}

export async function assertProjectAccess(user: Pick<User, "id" | "role">, projectId: string) {
  void user;
  void projectId;
}

export async function assertIssueAccess(user: Pick<User, "id" | "role">, issueId: string) {
  void user;
  void issueId;
}
