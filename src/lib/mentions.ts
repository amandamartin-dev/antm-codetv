import { CommentType, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

const USER_MENTION_REGEX = /@([a-zA-Z0-9._-]+)/g;
const ISSUE_MENTION_REGEX = /#([A-Z][A-Z0-9-]*-\d+)/g;
const PROJECT_MENTION_REGEX = /~([A-Z][A-Z0-9-]*)/g;

export class MentionResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MentionResolutionError";
  }
}

function uniqueMatches(regex: RegExp, body: string) {
  const values = new Set<string>();

  for (const match of body.matchAll(regex)) {
    values.add(match[1]);
  }

  return [...values];
}

function normalizeUserToken(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function userLocalPart(email: string) {
  const split = email.split("@");
  return split[0]?.toLowerCase() ?? "";
}

export async function resolveMentions(body: string) {
  const userTokens = uniqueMatches(USER_MENTION_REGEX, body);
  const issueTokens = uniqueMatches(ISSUE_MENTION_REGEX, body).map((token) => token.toUpperCase());
  const projectTokens = uniqueMatches(PROJECT_MENTION_REGEX, body).map((token) => token.toUpperCase());

  const unresolved: string[] = [];
  const mentions: Array<{
    mentionedUserId?: string;
    mentionedIssueId?: string;
    mentionedProjectId?: string;
  }> = [];

  if (userTokens.length > 0) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        name: true,
      },
    });

    for (const token of userTokens) {
      const normalized = normalizeUserToken(token);
      const found = users.find((user) => {
        return (
          user.clerkUserId.toLowerCase() === normalized ||
          userLocalPart(user.email) === normalized ||
          normalizeName(user.name) === normalized
        );
      });

      if (!found) {
        unresolved.push(`@${token}`);
        continue;
      }

      mentions.push({ mentionedUserId: found.id });
    }
  }

  if (issueTokens.length > 0) {
    const issues = await prisma.issue.findMany({
      where: {
        key: {
          in: issueTokens,
        },
      },
      select: {
        id: true,
        key: true,
      },
    });

    for (const key of issueTokens) {
      const found = issues.find((issue) => issue.key === key);
      if (!found) {
        unresolved.push(`#${key}`);
        continue;
      }
      mentions.push({ mentionedIssueId: found.id });
    }
  }

  if (projectTokens.length > 0) {
    const projects = await prisma.project.findMany({
      where: {
        key: {
          in: projectTokens,
        },
      },
      select: {
        id: true,
        key: true,
      },
    });

    for (const key of projectTokens) {
      const found = projects.find((project) => project.key === key);
      if (!found) {
        unresolved.push(`~${key}`);
        continue;
      }
      mentions.push({ mentionedProjectId: found.id });
    }
  }

  if (unresolved.length > 0) {
    throw new MentionResolutionError(`Unknown mentions: ${unresolved.join(", ")}`);
  }

  return mentions;
}

export async function syncCommentMentions(args: {
  commentType: CommentType;
  commentId: string;
  commentBody: string;
  authorUserId: string;
  linkUrl: string;
  titlePrefix: string;
}) {
  const mentions = await resolveMentions(args.commentBody);

  await prisma.$transaction(async (tx) => {
    await tx.commentMention.deleteMany({
      where: {
        commentType: args.commentType,
        commentId: args.commentId,
      },
    });

    if (mentions.length > 0) {
      await tx.commentMention.createMany({
        data: mentions.map((mention) => ({
          commentType: args.commentType,
          commentId: args.commentId,
          mentionedUserId: mention.mentionedUserId,
          mentionedIssueId: mention.mentionedIssueId,
          mentionedProjectId: mention.mentionedProjectId,
        })),
      });
    }

    const recipientIds = [...new Set(mentions.map((mention) => mention.mentionedUserId).filter(Boolean))] as string[];

    if (recipientIds.length > 0) {
      await tx.notification.createMany({
        data: recipientIds
          .filter((userId) => userId !== args.authorUserId)
          .map((userId) => ({
            userId,
            type: NotificationType.MENTION,
            title: `${args.titlePrefix} mention`,
            body: args.commentBody.slice(0, 240),
            linkUrl: args.linkUrl,
          })),
      });
    }
  });
}
