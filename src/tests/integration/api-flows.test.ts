import {
  CommentType,
  IssuePriority,
  IssueStatus,
  ProjectStatus,
  Role,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createDependency } from "@/app/api/issues/[issueId]/dependencies/route";
import { POST as createIssueComment } from "@/app/api/issues/[issueId]/comments/route";
import { POST as createIssue } from "@/app/api/issues/route";
import { POST as createLabel } from "@/app/api/labels/route";
import { POST as createProject } from "@/app/api/projects/route";
import { POST as createTeam } from "@/app/api/teams/route";
import { prisma } from "@/lib/db";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const describeIfDatabase = hasDatabase ? describe : describe.skip;

describeIfDatabase("integration API flows", () => {
  const runId = `it-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const adminClerkUserId = `admin-${runId}`;
  const memberClerkUserId = `member-${runId}`;

  let adminUserId = "";
  let memberUserId = "";

  beforeAll(async () => {
    const [admin, member] = await Promise.all([
      prisma.user.create({
        data: {
          clerkUserId: adminClerkUserId,
          email: `${adminClerkUserId}@example.com`,
          name: adminClerkUserId,
          role: Role.ADMIN,
        },
      }),
      prisma.user.create({
        data: {
          clerkUserId: memberClerkUserId,
          email: `${memberClerkUserId}@example.com`,
          name: memberClerkUserId,
          role: Role.MEMBER,
        },
      }),
    ]);

    adminUserId = admin.id;
    memberUserId = member.id;
  });

  afterAll(async () => {
    const createdComments = await prisma.issueComment.findMany({
      where: {
        body: {
          contains: runId,
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.notification.deleteMany({
      where: {
        OR: [{ userId: adminUserId }, { userId: memberUserId }],
      },
    });

    await prisma.commentMention.deleteMany({
      where: {
        commentId: {
          in: createdComments.map((comment) => comment.id),
        },
      },
    });

    await prisma.issueComment.deleteMany({
      where: {
        body: {
          contains: runId,
        },
      },
    });

    await prisma.issueDependency.deleteMany({
      where: {
        OR: [
          {
            issue: {
              key: {
                startsWith: `IT${runId.slice(-4).toUpperCase()}`,
              },
            },
          },
          {
            blockedByIssue: {
              key: {
                startsWith: `IT${runId.slice(-4).toUpperCase()}`,
              },
            },
          },
        ],
      },
    });

    await prisma.issue.deleteMany({
      where: {
        OR: [
          {
            title: {
              contains: runId,
            },
          },
          {
            key: {
              startsWith: `IT${runId.slice(-4).toUpperCase()}`,
            },
          },
        ],
      },
    });

    await prisma.release.deleteMany({
      where: {
        name: {
          contains: runId,
        },
      },
    });

    await prisma.projectMember.deleteMany({
      where: {
        OR: [{ userId: adminUserId }, { userId: memberUserId }],
      },
    });

    await prisma.project.deleteMany({
      where: {
        key: {
          startsWith: `IT-${runId.slice(-4).toUpperCase()}`,
        },
      },
    });

    await prisma.teamMember.deleteMany({
      where: {
        OR: [{ userId: adminUserId }, { userId: memberUserId }],
      },
    });

    await prisma.team.deleteMany({
      where: {
        key: {
          startsWith: `IT${runId.slice(-4).toUpperCase()}`,
        },
      },
    });

    await prisma.label.deleteMany({
      where: {
        name: {
          contains: runId,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        clerkUserId: {
          in: [adminClerkUserId, memberClerkUserId],
        },
      },
    });
  });

  it("covers team/project/issue CRUD and dependency flow", async () => {
    const teamKey = `IT${runId.slice(-4).toUpperCase()}`;
    const projectKey = `IT-${runId.slice(-4).toUpperCase()}`;

    const teamRequest = new Request("http://localhost/api/teams", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        key: teamKey,
        name: `Team ${runId}`,
      }),
    });

    const teamResponse = await createTeam(teamRequest);
    expect(teamResponse.status).toBe(201);
    const teamPayload = (await teamResponse.json()) as { data: { id: string } };

    await prisma.teamMember.createMany({
      data: [
        { teamId: teamPayload.data.id, userId: adminUserId },
        { teamId: teamPayload.data.id, userId: memberUserId },
      ],
      skipDuplicates: true,
    });

    const projectRequest = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        key: projectKey,
        name: `Project ${runId}`,
        description: `Project for ${runId}`,
        status: ProjectStatus.ACTIVE,
        leadUserId: adminUserId,
        memberIds: [adminUserId, memberUserId],
      }),
    });

    const projectResponse = await createProject(projectRequest);
    expect(projectResponse.status).toBe(201);
    const projectPayload = (await projectResponse.json()) as { data: { id: string } };

    const labelRequest = new Request("http://localhost/api/labels", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        name: `label-${runId}`,
        color: "#22c55e",
      }),
    });

    const labelResponse = await createLabel(labelRequest);
    expect(labelResponse.status).toBe(201);
    const labelPayload = (await labelResponse.json()) as { data: { id: string } };

    const issueOneRequest = new Request("http://localhost/api/issues", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        title: `Issue One ${runId}`,
        description: `Issue One ${runId}`,
        status: IssueStatus.TODO,
        priority: IssuePriority.HIGH,
        teamId: teamPayload.data.id,
        projectId: projectPayload.data.id,
        assigneeUserId: memberUserId,
        labelId: labelPayload.data.id,
      }),
    });

    const issueOneResponse = await createIssue(issueOneRequest);
    expect(issueOneResponse.status).toBe(201);
    const issueOnePayload = (await issueOneResponse.json()) as { data: { id: string; key: string } };

    const issueTwoRequest = new Request("http://localhost/api/issues", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        title: `Issue Two ${runId}`,
        description: `Issue Two ${runId}`,
        status: IssueStatus.TODO,
        priority: IssuePriority.MEDIUM,
        teamId: teamPayload.data.id,
        projectId: projectPayload.data.id,
        assigneeUserId: memberUserId,
        labelId: labelPayload.data.id,
      }),
    });

    const issueTwoResponse = await createIssue(issueTwoRequest);
    expect(issueTwoResponse.status).toBe(201);
    const issueTwoPayload = (await issueTwoResponse.json()) as { data: { id: string } };

    const dependencyRequest = new Request("http://localhost/api/issues/dependency", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        blockedByIssueId: issueOnePayload.data.id,
      }),
    });

    const dependencyResponse = await createDependency(dependencyRequest, {
      params: Promise.resolve({ issueId: issueTwoPayload.data.id }),
    });

    expect(dependencyResponse.status).toBe(201);

    const savedDependency = await prisma.issueDependency.findUnique({
      where: {
        issueId_blockedByIssueId: {
          issueId: issueTwoPayload.data.id,
          blockedByIssueId: issueOnePayload.data.id,
        },
      },
    });

    expect(savedDependency).not.toBeNull();

    const assignmentNotification = await prisma.notification.findFirst({
      where: {
        userId: memberUserId,
        type: "ISSUE_ASSIGNED",
        linkUrl: `/issues/${issueOnePayload.data.key}`,
      },
    });

    expect(assignmentNotification).not.toBeNull();
  });

  it("parses mentions and creates in-app notifications", async () => {
    const team = await prisma.team.findFirstOrThrow({
      where: {
        key: {
          startsWith: `IT${runId.slice(-4).toUpperCase()}`,
        },
      },
    });

    const project = await prisma.project.findFirstOrThrow({
      where: {
        key: {
          startsWith: `IT-${runId.slice(-4).toUpperCase()}`,
        },
      },
    });

    const issue = await prisma.issue.findFirstOrThrow({
      where: {
        teamId: team.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const commentBody = `mention test ${runId} @${memberClerkUserId} #${issue.key} ~${project.key}`;

    const commentRequest = new Request("http://localhost/api/issues/comment", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dev-user-id": adminClerkUserId,
      },
      body: JSON.stringify({
        body: commentBody,
      }),
    });

    const commentResponse = await createIssueComment(commentRequest, {
      params: Promise.resolve({ issueId: issue.id }),
    });

    expect(commentResponse.status).toBe(201);

    const commentPayload = (await commentResponse.json()) as { data: { id: string } };

    const mentions = await prisma.commentMention.findMany({
      where: {
        commentType: CommentType.ISSUE,
        commentId: commentPayload.data.id,
      },
    });

    expect(mentions.length).toBeGreaterThanOrEqual(3);

    const mentionNotification = await prisma.notification.findFirst({
      where: {
        userId: memberUserId,
        type: "MENTION",
        linkUrl: `/issues/${issue.key}`,
      },
    });

    expect(mentionNotification).not.toBeNull();
  });
});
