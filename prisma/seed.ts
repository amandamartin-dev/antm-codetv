import {
  IssuePriority,
  IssueStatus,
  PrismaClient,
  ProjectStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaultClerkUserId = process.env.SEED_DEFAULT_CLERK_USER_ID ?? "local_user_clerk_id";
  const defaultEmail = process.env.SEED_DEFAULT_EMAIL ?? "user@example.com";
  const defaultName = process.env.SEED_DEFAULT_NAME ?? "Local User";

  const defaultUser = await prisma.user.upsert({
    where: { clerkUserId: defaultClerkUserId },
    create: {
      clerkUserId: defaultClerkUserId,
      email: defaultEmail,
      name: defaultName,
    },
    update: {
      email: defaultEmail,
      name: defaultName,
    },
  });

  const engTeam = await prisma.team.upsert({
    where: { key: "ENG" },
    create: { key: "ENG", name: "Engineering" },
    update: { name: "Engineering" },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: engTeam.id,
        userId: defaultUser.id,
      },
    },
    create: {
      teamId: engTeam.id,
      userId: defaultUser.id,
    },
    update: {},
  });

  const project = await prisma.project.upsert({
    where: { key: "CORE-PLATFORM" },
    create: {
      key: "CORE-PLATFORM",
      name: "Core Platform",
      description: "Initial MVP project",
      status: ProjectStatus.ACTIVE,
      leadUserId: defaultUser.id,
    },
    update: {
      name: "Core Platform",
      description: "Initial MVP project",
      status: ProjectStatus.ACTIVE,
      leadUserId: defaultUser.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: defaultUser.id,
      },
    },
    create: {
      projectId: project.id,
      userId: defaultUser.id,
    },
    update: {},
  });

  const release = await prisma.release.upsert({
    where: {
      id: "seed-release-v1",
    },
    create: {
      id: "seed-release-v1",
      projectId: project.id,
      name: "v1",
      startsAt: new Date(),
    },
    update: {
      projectId: project.id,
      name: "v1",
    },
  });

  const label = await prisma.label.upsert({
    where: { name: "bug" },
    create: { name: "bug", color: "#ef4444" },
    update: { color: "#ef4444" },
  });

  const issueOne = await prisma.issue.upsert({
    where: { key: "ENG-1" },
    create: {
      key: "ENG-1",
      title: "Set up MVP shell",
      description: "Create routes, auth, and initial schema",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: project.id,
      assigneeUserId: defaultUser.id,
      labelId: label.id,
    },
    update: {
      title: "Set up MVP shell",
      description: "Create routes, auth, and initial schema",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: project.id,
      assigneeUserId: defaultUser.id,
      labelId: label.id,
    },
  });

  const issueTwo = await prisma.issue.upsert({
    where: { key: "ENG-2" },
    create: {
      key: "ENG-2",
      title: "Implement mention notifications",
      description: "Comment parser for @user #issue ~project",
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: project.id,
      assigneeUserId: defaultUser.id,
      labelId: label.id,
    },
    update: {
      title: "Implement mention notifications",
      description: "Comment parser for @user #issue ~project",
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: project.id,
      assigneeUserId: defaultUser.id,
      labelId: label.id,
    },
  });

  await prisma.issueDependency.upsert({
    where: {
      issueId_blockedByIssueId: {
        issueId: issueTwo.id,
        blockedByIssueId: issueOne.id,
      },
    },
    create: {
      issueId: issueTwo.id,
      blockedByIssueId: issueOne.id,
    },
    update: {},
  });

  await prisma.notification.create({
    data: {
      userId: defaultUser.id,
      type: "GENERIC",
      title: "Seed complete",
      body: `Release ${release.name} and sample issues are ready.`,
      linkUrl: "/",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
