import { NextResponse } from "next/server";
import { assertIssueAccess, assertProjectAccess, assertTeamAccess } from "@/lib/access";
import { requireAppUser, resolveUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { updateIssueSchema } from "@/lib/validators";

type Params = Promise<{ issueId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        team: {
          select: { id: true, key: true, name: true },
        },
        project: {
          select: { id: true, key: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        label: {
          select: { id: true, name: true, color: true },
        },
        dependencies: {
          include: {
            blockedByIssue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
        blockedBy: {
          include: {
            issue: {
              select: { id: true, key: true, title: true, status: true },
            },
          },
        },
      },
    });

    if (!issue) {
      throw new Error("Issue not found");
    }

    return NextResponse.json({ data: issue });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    const parsed = await parseBody(request, updateIssueSchema);
    if (parsed.error) {
      return parsed.error;
    }

    if (parsed.data.teamId) {
      await assertTeamAccess(user, parsed.data.teamId);
    }

    if (parsed.data.projectId) {
      await assertProjectAccess(user, parsed.data.projectId);
    }

    const assigneeUserId = await resolveUserId({
      userId: parsed.data.assigneeUserId,
      clerkUserId: parsed.data.assigneeClerkUserId,
    });

    const current = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { key: true, assigneeUserId: true, title: true },
    });

    if (!current) {
      throw new Error("Issue not found");
    }

    const issue = await prisma.issue.update({
      where: { id: issueId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : parsed.data.dueDate,
        teamId: parsed.data.teamId,
        projectId: parsed.data.projectId,
        assigneeUserId,
        labelId: parsed.data.labelId,
      },
    });

    if (issue.assigneeUserId && issue.assigneeUserId !== current.assigneeUserId && issue.assigneeUserId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: issue.assigneeUserId,
          type: "ISSUE_ASSIGNED",
          title: `Assigned to ${current.key}`,
          body: current.title,
          linkUrl: `/issues/${current.key}`,
        },
      });
    }

    return NextResponse.json({ data: issue });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { issueId } = await params;
    const user = await requireAppUser(request);
    await assertIssueAccess(user, issueId);

    await prisma.issue.delete({ where: { id: issueId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
