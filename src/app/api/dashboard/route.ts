import { IssueStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRouteError } from "@/lib/route-errors";

export async function GET() {
  try {
    // Show all projects and issues to everyone
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        status: true,
        issues: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const openIssueStatuses: IssueStatus[] = [
      IssueStatus.BACKLOG,
      IssueStatus.TODO,
      IssueStatus.IN_PROGRESS,
    ];

    const issueCountsByProject = projects.map((project) => {
      const open = project.issues.filter((issue) => openIssueStatuses.includes(issue.status)).length;
      const completed = project.issues.filter((issue) => issue.status === IssueStatus.DONE).length;
      const total = project.issues.length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        open,
        completed,
        total,
        progress,
      };
    });

    // Show all notifications to everyone
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        linkUrl: true,
        readAt: true,
        createdAt: true,
      },
    });

    const data = {
      openVsCompleted: issueCountsByProject,
      projectProgress: issueCountsByProject.map((item) => ({
        projectKey: item.projectKey,
        projectName: item.projectName,
        progress: item.progress,
      })),
      notifications,
    };

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error);
  }
}
