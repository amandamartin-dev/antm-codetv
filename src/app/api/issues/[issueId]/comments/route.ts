import { CommentType, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertIssueAccess } from "@/lib/access";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { syncCommentMentions } from "@/lib/mentions";
import { handleRouteError } from "@/lib/route-errors";
import {
  createCommentSchema,
  deleteCommentSchema,
  updateCommentSchema,
} from "@/lib/validators";

type Params = Promise<{ issueId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const comments = await prisma.issueComment.findMany({
      where: { issueId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, createCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { key: true },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    const comment = await prisma.issueComment.create({
      data: {
        issueId,
        authorUserId: user.id,
        body: parsed.data.body,
      },
    });

    await syncCommentMentions({
      commentType: CommentType.ISSUE,
      commentId: comment.id,
      commentBody: parsed.data.body,
      authorUserId: user.id,
      linkUrl: `/issues/${issue.key}`,
      titlePrefix: "Issue",
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, updateCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const existing = await prisma.issueComment.findUnique({
      where: {
        id: parsed.data.commentId,
        issueId,
      },
      include: {
        issue: {
          select: { key: true },
        },
      },
    });

    if (!existing) {
      throw new Error("Comment not found");
    }

    if (existing.authorUserId !== user.id && user.role !== Role.ADMIN) {
      throw new Error("Only author or admin can edit comments");
    }

    const updated = await prisma.issueComment.update({
      where: {
        id: parsed.data.commentId,
        issueId,
      },
      data: {
        body: parsed.data.body,
      },
    });

    await syncCommentMentions({
      commentType: CommentType.ISSUE,
      commentId: updated.id,
      commentBody: updated.body,
      authorUserId: user.id,
      linkUrl: `/issues/${existing.issue.key}`,
      titlePrefix: "Issue",
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, deleteCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const existing = await prisma.issueComment.findUnique({
      where: {
        id: parsed.data.commentId,
        issueId,
      },
      select: {
        authorUserId: true,
      },
    });

    if (!existing) {
      throw new Error("Comment not found");
    }

    if (existing.authorUserId !== user.id && user.role !== Role.ADMIN) {
      throw new Error("Only author or admin can delete comments");
    }

    await prisma.$transaction(async (tx) => {
      await tx.commentMention.deleteMany({
        where: {
          commentType: CommentType.ISSUE,
          commentId: parsed.data.commentId,
        },
      });

      await tx.issueComment.delete({
        where: {
          id: parsed.data.commentId,
          issueId,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
