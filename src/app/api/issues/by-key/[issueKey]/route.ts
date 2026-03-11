import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueAccessWhere } from "@/lib/access";
import { handleRouteError } from "@/lib/route-errors";

type Params = Promise<{ issueKey: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { issueKey } = await params;
    const user = await requireAppUser(request);

    const issue = await prisma.issue.findFirst({
      where: {
        key: issueKey.toUpperCase(),
        AND: [issueAccessWhere(user)],
      },
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
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: {
            createdAt: "desc",
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
