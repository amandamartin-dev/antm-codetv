import { NextResponse } from "next/server";
import { IssueStatus, Prisma } from "@prisma/client";
import { assertProjectAccess, assertTeamAccess } from "@/lib/access";
import { requireAppUser, resolveUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateIssueKey } from "@/lib/keys";
import { parseBody } from "@/lib/http";
import { handleRouteError } from "@/lib/route-errors";
import { createIssueSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const rawStatus = url.searchParams.get("status");
    const status =
      rawStatus && Object.values(IssueStatus).includes(rawStatus as IssueStatus)
        ? (rawStatus as IssueStatus)
        : undefined;
    const teamId = url.searchParams.get("teamId");
    const projectId = url.searchParams.get("projectId");
    const assigneeUserId = url.searchParams.get("assigneeUserId");

    // Show all issues to everyone
    const where: Prisma.IssueWhereInput = {
      status: status ?? undefined,
      teamId: teamId ?? undefined,
      projectId: projectId ?? undefined,
      assigneeUserId: assigneeUserId ?? undefined,
    };

    const issues = await prisma.issue.findMany({
      where,
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: issues });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser(request);
    const parsed = await parseBody(request, createIssueSchema);

    if (parsed.error) {
      return parsed.error;
    }

    await assertTeamAccess(user, parsed.data.teamId);

    if (parsed.data.projectId) {
      await assertProjectAccess(user, parsed.data.projectId);
    }

    const assigneeUserId = await resolveUserId({
      userId: parsed.data.assigneeUserId,
      clerkUserId: parsed.data.assigneeClerkUserId,
    });

    const issueKey = await generateIssueKey(parsed.data.teamId);

    const issue = await prisma.issue.create({
      data: {
        key: issueKey,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        teamId: parsed.data.teamId,
        projectId: parsed.data.projectId,
        assigneeUserId,
        labelId: parsed.data.labelId,
      },
      include: {
        team: {
          select: { id: true, key: true, name: true },
        },
      },
    });

    if (issue.assigneeUserId && issue.assigneeUserId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: issue.assigneeUserId,
          type: "ISSUE_ASSIGNED",
          title: `Assigned to ${issue.key}`,
          body: issue.title,
          linkUrl: `/issues/${issue.key}`,
        },
      });
    }

    return NextResponse.json({ data: issue }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
