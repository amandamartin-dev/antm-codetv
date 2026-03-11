import { prisma } from "@/lib/db";

const PROJECT_KEY_SANITIZE_REGEX = /[^A-Z0-9-]/g;

export function normalizeProjectKey(rawValue: string) {
  return rawValue
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(PROJECT_KEY_SANITIZE_REGEX, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildNextIssueKey(teamKey: string, existingKeys: string[]) {
  const prefix = `${teamKey.toUpperCase()}-`;

  const maxNumber = existingKeys.reduce((max, key) => {
    if (!key.startsWith(prefix)) {
      return max;
    }

    const suffix = key.slice(prefix.length);
    const parsed = Number.parseInt(suffix, 10);

    if (Number.isNaN(parsed)) {
      return max;
    }

    return Math.max(max, parsed);
  }, 0);

  return `${prefix}${maxNumber + 1}`;
}

export async function generateIssueKey(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { key: true },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  const existingIssues = await prisma.issue.findMany({
    where: {
      key: {
        startsWith: `${team.key.toUpperCase()}-`,
      },
    },
    select: {
      key: true,
    },
  });

  return buildNextIssueKey(
    team.key,
    existingIssues.map((issue) => issue.key),
  );
}
