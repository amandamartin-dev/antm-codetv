import { CommentType, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { assertProjectAccess } from "@/lib/access";
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

type Params = Promise<{ projectId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const comments = await prisma.projectComment.findMany({
      where: { projectId },
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
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, createCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { key: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const comment = await prisma.projectComment.create({
      data: {
        projectId,
        authorUserId: user.id,
        body: parsed.data.body,
      },
    });

    await syncCommentMentions({
      commentType: CommentType.PROJECT,
      commentId: comment.id,
      commentBody: parsed.data.body,
      authorUserId: user.id,
      linkUrl: `/projects/${project.key}`,
      titlePrefix: "Project",
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, updateCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const existing = await prisma.projectComment.findUnique({
      where: { id: parsed.data.commentId, projectId },
      include: {
        project: {
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

    const updated = await prisma.projectComment.update({
      where: {
        id: parsed.data.commentId,
        projectId,
      },
      data: {
        body: parsed.data.body,
      },
    });

    await syncCommentMentions({
      commentType: CommentType.PROJECT,
      commentId: updated.id,
      commentBody: updated.body,
      authorUserId: user.id,
      linkUrl: `/projects/${existing.project.key}`,
      titlePrefix: "Project",
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { projectId } = await params;
    const user = await requireAppUser(request);
    await assertProjectAccess(user, projectId);

    const parsed = await parseBody(request, deleteCommentSchema);
    if (parsed.error) {
      return parsed.error;
    }

    const existing = await prisma.projectComment.findUnique({
      where: { id: parsed.data.commentId, projectId },
      select: { authorUserId: true },
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
          commentType: CommentType.PROJECT,
          commentId: parsed.data.commentId,
        },
      });

      await tx.projectComment.delete({
        where: {
          id: parsed.data.commentId,
          projectId,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
