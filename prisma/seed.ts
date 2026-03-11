import {
  IssuePriority,
  IssueStatus,
  PrismaClient,
  ProjectStatus,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ═══════════════════════════════════════════════════════════════════════════
  // USERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const adminClerkUserId = process.env.SEED_ADMIN_CLERK_USER_ID ?? "admin_clerk_user_id";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin User";

  const admin = await prisma.user.upsert({
    where: { clerkUserId: adminClerkUserId },
    create: {
      clerkUserId: adminClerkUserId,
      email: adminEmail,
      name: adminName,
      role: Role.ADMIN,
    },
    update: {
      email: adminEmail,
      name: adminName,
      role: Role.ADMIN,
    },
  });

  // Create additional team members
  const alex = await prisma.user.upsert({
    where: { clerkUserId: "clerk_alex_chen" },
    create: {
      clerkUserId: "clerk_alex_chen",
      email: "alex@example.com",
      name: "Alex Chen",
      role: Role.MEMBER,
    },
    update: {},
  });

  const jordan = await prisma.user.upsert({
    where: { clerkUserId: "clerk_jordan_lee" },
    create: {
      clerkUserId: "clerk_jordan_lee",
      email: "jordan@example.com",
      name: "Jordan Lee",
      role: Role.MEMBER,
    },
    update: {},
  });

  const sam = await prisma.user.upsert({
    where: { clerkUserId: "clerk_sam_rivera" },
    create: {
      clerkUserId: "clerk_sam_rivera",
      email: "sam@example.com",
      name: "Sam Rivera",
      role: Role.MEMBER,
    },
    update: {},
  });

  const taylor = await prisma.user.upsert({
    where: { clerkUserId: "clerk_taylor_kim" },
    create: {
      clerkUserId: "clerk_taylor_kim",
      email: "taylor@example.com",
      name: "Taylor Kim",
      role: Role.MEMBER,
    },
    update: {},
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEAMS
  // ═══════════════════════════════════════════════════════════════════════════

  const engTeam = await prisma.team.upsert({
    where: { key: "ENG" },
    create: { key: "ENG", name: "Engineering" },
    update: { name: "Engineering" },
  });

  const infraTeam = await prisma.team.upsert({
    where: { key: "INF" },
    create: { key: "INF", name: "Infrastructure" },
    update: { name: "Infrastructure" },
  });

  const designTeam = await prisma.team.upsert({
    where: { key: "DES" },
    create: { key: "DES", name: "Design" },
    update: { name: "Design" },
  });

  const dataTeam = await prisma.team.upsert({
    where: { key: "DAT" },
    create: { key: "DAT", name: "Data" },
    update: { name: "Data" },
  });

  // Add all users to teams
  const allUsers = [admin, alex, jordan, sam, taylor];
  for (const user of allUsers) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: engTeam.id, userId: user.id } },
      create: { teamId: engTeam.id, userId: user.id },
      update: {},
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LABELS
  // ═══════════════════════════════════════════════════════════════════════════

  const bugLabel = await prisma.label.upsert({
    where: { name: "bug" },
    create: { name: "bug", color: "#ef4444" },
    update: { color: "#ef4444" },
  });

  const featureLabel = await prisma.label.upsert({
    where: { name: "feature" },
    create: { name: "feature", color: "#22c55e" },
    update: { color: "#22c55e" },
  });

  const techDebtLabel = await prisma.label.upsert({
    where: { name: "tech-debt" },
    create: { name: "tech-debt", color: "#f59e0b" },
    update: { color: "#f59e0b" },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTS - These will appear as regions on the world map
  // ═══════════════════════════════════════════════════════════════════════════

  // Project 1: Auth Castle (COMPLETED)
  const authProject = await prisma.project.upsert({
    where: { key: "AUTH" },
    create: {
      key: "AUTH",
      name: "Auth Castle",
      description: "Authentication and authorization system",
      status: ProjectStatus.COMPLETED,
      leadUserId: alex.id,
    },
    update: {
      name: "Auth Castle",
      status: ProjectStatus.COMPLETED,
      leadUserId: alex.id,
    },
  });

  // Project 2: Dashboard Dunes (ACTIVE - current focus)
  const dashboardProject = await prisma.project.upsert({
    where: { key: "DASH" },
    create: {
      key: "DASH",
      name: "Dashboard Dunes",
      description: "Main dashboard and UI components",
      status: ProjectStatus.ACTIVE,
      leadUserId: jordan.id,
    },
    update: {
      name: "Dashboard Dunes",
      status: ProjectStatus.ACTIVE,
      leadUserId: jordan.id,
    },
  });

  // Project 3: API Archipelago (ACTIVE)
  const apiProject = await prisma.project.upsert({
    where: { key: "API" },
    create: {
      key: "API",
      name: "API Archipelago",
      description: "REST API and integrations",
      status: ProjectStatus.ACTIVE,
      leadUserId: alex.id,
    },
    update: {
      name: "API Archipelago",
      status: ProjectStatus.ACTIVE,
      leadUserId: alex.id,
    },
  });

  // Project 4: Design Peaks (PLANNED - locked)
  const designProject = await prisma.project.upsert({
    where: { key: "DS" },
    create: {
      key: "DS",
      name: "Design Peaks",
      description: "Design system and component library",
      status: ProjectStatus.PLANNED,
      leadUserId: sam.id,
    },
    update: {
      name: "Design Peaks",
      status: ProjectStatus.PLANNED,
      leadUserId: sam.id,
    },
  });

  // Project 5: Data Volcano (ARCHIVED - paused)
  const dataProject = await prisma.project.upsert({
    where: { key: "DATA" },
    create: {
      key: "DATA",
      name: "Data Volcano",
      description: "Data pipeline and analytics",
      status: ProjectStatus.ARCHIVED,
      leadUserId: taylor.id,
    },
    update: {
      name: "Data Volcano",
      status: ProjectStatus.ARCHIVED,
      leadUserId: taylor.id,
    },
  });

  // Add project members
  const allProjects = [authProject, dashboardProject, apiProject, designProject, dataProject];
  for (const project of allProjects) {
    for (const user of allUsers) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: user.id } },
        create: { projectId: project.id, userId: user.id },
        update: {},
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES - Auth Castle (COMPLETED)
  // ═══════════════════════════════════════════════════════════════════════════

  const authIssue1 = await prisma.issue.upsert({
    where: { key: "ENG-1" },
    create: {
      key: "ENG-1",
      title: "Clerk integration",
      description: "Set up Clerk for authentication",
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: authProject.id,
      assigneeUserId: alex.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "Clerk integration",
      status: IssueStatus.DONE,
      projectId: authProject.id,
      assigneeUserId: alex.id,
    },
  });

  const authIssue2 = await prisma.issue.upsert({
    where: { key: "ENG-2" },
    create: {
      key: "ENG-2",
      title: "GitHub SSO",
      description: "Add GitHub OAuth provider",
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: authProject.id,
      assigneeUserId: alex.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "GitHub SSO",
      status: IssueStatus.DONE,
      projectId: authProject.id,
    },
  });

  const authIssue3 = await prisma.issue.upsert({
    where: { key: "ENG-3" },
    create: {
      key: "ENG-3",
      title: "Session middleware",
      description: "Implement session handling middleware",
      status: IssueStatus.DONE,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: authProject.id,
      assigneeUserId: jordan.id,
    },
    update: {
      title: "Session middleware",
      status: IssueStatus.DONE,
      projectId: authProject.id,
    },
  });

  const authIssue4 = await prisma.issue.upsert({
    where: { key: "ENG-4" },
    create: {
      key: "ENG-4",
      title: "Role-based access",
      description: "Implement RBAC system",
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: authProject.id,
      assigneeUserId: alex.id,
    },
    update: {
      title: "Role-based access",
      status: IssueStatus.DONE,
      projectId: authProject.id,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES - Dashboard Dunes (ACTIVE - current sprint)
  // ═══════════════════════════════════════════════════════════════════════════

  const dashIssue1 = await prisma.issue.upsert({
    where: { key: "ENG-5" },
    create: {
      key: "ENG-5",
      title: "Dashboard layout",
      description: "Create main dashboard layout with sidebar",
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      assigneeUserId: jordan.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "Dashboard layout",
      status: IssueStatus.DONE,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue2 = await prisma.issue.upsert({
    where: { key: "ENG-6" },
    create: {
      key: "ENG-6",
      title: "Issue cards",
      description: "Design and implement issue card components",
      status: IssueStatus.DONE,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      assigneeUserId: jordan.id,
    },
    update: {
      title: "Issue cards",
      status: IssueStatus.DONE,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue3 = await prisma.issue.upsert({
    where: { key: "ENG-7" },
    create: {
      key: "ENG-7",
      title: "Progress bars",
      description: "Add progress indicators for projects",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      assigneeUserId: sam.id,
    },
    update: {
      title: "Progress bars",
      status: IssueStatus.IN_PROGRESS,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue4 = await prisma.issue.upsert({
    where: { key: "ENG-8" },
    create: {
      key: "ENG-8",
      title: "Notifications widget",
      description: "Real-time notification dropdown",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      assigneeUserId: jordan.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "Notifications widget",
      status: IssueStatus.IN_PROGRESS,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue5 = await prisma.issue.upsert({
    where: { key: "ENG-9" },
    create: {
      key: "ENG-9",
      title: "Activity feed",
      description: "Show recent activity stream",
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      assigneeUserId: taylor.id,
    },
    update: {
      title: "Activity feed",
      status: IssueStatus.TODO,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue6 = await prisma.issue.upsert({
    where: { key: "ENG-10" },
    create: {
      key: "ENG-10",
      title: "Quick actions",
      description: "Add quick action buttons",
      status: IssueStatus.TODO,
      priority: IssuePriority.LOW,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
    },
    update: {
      title: "Quick actions",
      status: IssueStatus.TODO,
      projectId: dashboardProject.id,
    },
  });

  const dashIssue7 = await prisma.issue.upsert({
    where: { key: "ENG-11" },
    create: {
      key: "ENG-11",
      title: "Keyboard shortcuts",
      description: "Implement keyboard navigation",
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.LOW,
      teamId: engTeam.id,
      projectId: dashboardProject.id,
      labelId: techDebtLabel.id,
    },
    update: {
      title: "Keyboard shortcuts",
      status: IssueStatus.BACKLOG,
      projectId: dashboardProject.id,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES - API Archipelago (ACTIVE)
  // ═══════════════════════════════════════════════════════════════════════════

  const apiIssue1 = await prisma.issue.upsert({
    where: { key: "INF-1" },
    create: {
      key: "INF-1",
      title: "REST endpoints",
      description: "Create core REST API endpoints",
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      teamId: infraTeam.id,
      projectId: apiProject.id,
      assigneeUserId: alex.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "REST endpoints",
      status: IssueStatus.DONE,
      projectId: apiProject.id,
    },
  });

  const apiIssue2 = await prisma.issue.upsert({
    where: { key: "INF-2" },
    create: {
      key: "INF-2",
      title: "Rate limiting",
      description: "Implement API rate limiting",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      teamId: infraTeam.id,
      projectId: apiProject.id,
      assigneeUserId: alex.id,
    },
    update: {
      title: "Rate limiting",
      status: IssueStatus.IN_PROGRESS,
      projectId: apiProject.id,
    },
  });

  const apiIssue3 = await prisma.issue.upsert({
    where: { key: "INF-3" },
    create: {
      key: "INF-3",
      title: "API keys",
      description: "API key generation and management",
      status: IssueStatus.TODO,
      priority: IssuePriority.HIGH,
      teamId: infraTeam.id,
      projectId: apiProject.id,
    },
    update: {
      title: "API keys",
      status: IssueStatus.TODO,
      projectId: apiProject.id,
    },
  });

  const apiIssue4 = await prisma.issue.upsert({
    where: { key: "INF-4" },
    create: {
      key: "INF-4",
      title: "Webhooks",
      description: "Webhook delivery system",
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.MEDIUM,
      teamId: infraTeam.id,
      projectId: apiProject.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "Webhooks",
      status: IssueStatus.BACKLOG,
      projectId: apiProject.id,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES - Design Peaks (PLANNED - locked)
  // ═══════════════════════════════════════════════════════════════════════════

  const desIssue1 = await prisma.issue.upsert({
    where: { key: "DES-1" },
    create: {
      key: "DES-1",
      title: "Color tokens",
      description: "Define design system color tokens",
      status: IssueStatus.TODO,
      priority: IssuePriority.HIGH,
      teamId: designTeam.id,
      projectId: designProject.id,
      assigneeUserId: sam.id,
    },
    update: {
      title: "Color tokens",
      status: IssueStatus.TODO,
      projectId: designProject.id,
    },
  });

  const desIssue2 = await prisma.issue.upsert({
    where: { key: "DES-2" },
    create: {
      key: "DES-2",
      title: "Typography",
      description: "Typography scale and fonts",
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.MEDIUM,
      teamId: designTeam.id,
      projectId: designProject.id,
    },
    update: {
      title: "Typography",
      status: IssueStatus.BACKLOG,
      projectId: designProject.id,
    },
  });

  const desIssue3 = await prisma.issue.upsert({
    where: { key: "DES-3" },
    create: {
      key: "DES-3",
      title: "Components",
      description: "Core UI component library",
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.HIGH,
      teamId: designTeam.id,
      projectId: designProject.id,
      labelId: featureLabel.id,
    },
    update: {
      title: "Components",
      status: IssueStatus.BACKLOG,
      projectId: designProject.id,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES - Data Volcano (ARCHIVED - paused)
  // ═══════════════════════════════════════════════════════════════════════════

  const datIssue1 = await prisma.issue.upsert({
    where: { key: "DAT-1" },
    create: {
      key: "DAT-1",
      title: "ETL framework",
      description: "Build ETL pipeline framework",
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      teamId: dataTeam.id,
      projectId: dataProject.id,
      assigneeUserId: taylor.id,
    },
    update: {
      title: "ETL framework",
      status: IssueStatus.IN_PROGRESS,
      projectId: dataProject.id,
    },
  });

  const datIssue2 = await prisma.issue.upsert({
    where: { key: "DAT-2" },
    create: {
      key: "DAT-2",
      title: "Warehouse schema",
      description: "Design data warehouse schema",
      status: IssueStatus.BACKLOG,
      priority: IssuePriority.MEDIUM,
      teamId: dataTeam.id,
      projectId: dataProject.id,
    },
    update: {
      title: "Warehouse schema",
      status: IssueStatus.BACKLOG,
      projectId: dataProject.id,
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPENDENCIES - Creates the "blocked by" relationships
  // ═══════════════════════════════════════════════════════════════════════════

  // Auth dependencies (chain)
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: authIssue2.id, blockedByIssueId: authIssue1.id } },
    create: { issueId: authIssue2.id, blockedByIssueId: authIssue1.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: authIssue3.id, blockedByIssueId: authIssue2.id } },
    create: { issueId: authIssue3.id, blockedByIssueId: authIssue2.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: authIssue4.id, blockedByIssueId: authIssue3.id } },
    create: { issueId: authIssue4.id, blockedByIssueId: authIssue3.id },
    update: {},
  });

  // Dashboard dependencies
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue2.id, blockedByIssueId: dashIssue1.id } },
    create: { issueId: dashIssue2.id, blockedByIssueId: dashIssue1.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue3.id, blockedByIssueId: dashIssue2.id } },
    create: { issueId: dashIssue3.id, blockedByIssueId: dashIssue2.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue4.id, blockedByIssueId: dashIssue1.id } },
    create: { issueId: dashIssue4.id, blockedByIssueId: dashIssue1.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue5.id, blockedByIssueId: dashIssue3.id } },
    create: { issueId: dashIssue5.id, blockedByIssueId: dashIssue3.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue5.id, blockedByIssueId: dashIssue4.id } },
    create: { issueId: dashIssue5.id, blockedByIssueId: dashIssue4.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: dashIssue6.id, blockedByIssueId: dashIssue5.id } },
    create: { issueId: dashIssue6.id, blockedByIssueId: dashIssue5.id },
    update: {},
  });

  // API dependencies
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: apiIssue2.id, blockedByIssueId: apiIssue1.id } },
    create: { issueId: apiIssue2.id, blockedByIssueId: apiIssue1.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: apiIssue3.id, blockedByIssueId: apiIssue2.id } },
    create: { issueId: apiIssue3.id, blockedByIssueId: apiIssue2.id },
    update: {},
  });

  // Design dependencies
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: desIssue2.id, blockedByIssueId: desIssue1.id } },
    create: { issueId: desIssue2.id, blockedByIssueId: desIssue1.id },
    update: {},
  });
  await prisma.issueDependency.upsert({
    where: { issueId_blockedByIssueId: { issueId: desIssue3.id, blockedByIssueId: desIssue2.id } },
    create: { issueId: desIssue3.id, blockedByIssueId: desIssue2.id },
    update: {},
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEASES
  // ═══════════════════════════════════════════════════════════════════════════

  await prisma.release.upsert({
    where: { id: "seed-release-v1" },
    create: {
      id: "seed-release-v1",
      projectId: dashboardProject.id,
      name: "v1.0 - MVP",
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2026-03-31"),
    },
    update: {
      projectId: dashboardProject.id,
      name: "v1.0 - MVP",
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "GENERIC",
      title: "World Map Ready",
      body: "The sprint world map has been seeded with sample projects and issues.",
      linkUrl: "/map",
    },
  });

  console.log("✅ Seed complete! Visit /map to see the world map.");
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
