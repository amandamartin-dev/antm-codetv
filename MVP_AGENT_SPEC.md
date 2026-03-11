# Linear-Style MVP Spec (Contract)

This file is the normative product and engineering contract.

Use with:
- `MVP_AGENT_RUNBOOK.md` for setup and build steps
- `MVP_AGENT_CHECKLIST.md` for completion gates

## Product Goal

Build a focused Linear-style issue tracker MVP that can be built end-to-end by an agent with minimal ambiguity.

## Locked Decisions

- Workspace model: single workspace only
- Auth: Clerk with GitHub SSO
- Frontend/backend: Next.js `16.x` App Router (single app)
- Language: TypeScript
- Database: Postgres + Prisma ORM
- Package manager: pnpm

## Core Scope

### Issues
- CRUD
- URL addressable (`/issues/[issueKey]`)
- Single assignee user (`assigneeUserId`)
- Assignable to one group/team (`teamId`)
- Assignable to one project (`projectId`)
- Optional single label (`labelId`) and no issue-label many-to-many table
- Due date
- Blocked-by / blocker-for relationships
- Comments with mention support (`@user`, `#issue`, `~project`)

### Projects
- CRUD
- URL addressable (`/projects/[projectKey]`)
- Groupable via releases (`releaseId`)
- Assignable users (lead + members)
- Comments with mention support (`@user`, `#issue`, `~project`)

### Users / Access
- Users can belong to groups/teams
- Users can be assigned to issues/projects
- Access control:
  - `ADMIN`: full workspace access
  - `MEMBER`: access to assigned teams/projects

### Dashboard
- One dashboard view with:
  - Open vs completed issues by project
  - Project progress summary
  - Notifications inbox widget

### Notifications
- In-app notifications only
- Shown in dashboard inbox and notifications page
- No email notifications
- No Slack/chat integration

## Explicitly Out of Scope

- Multi-workspace support
- Roadmaps/initiatives assignment
- Velocity charts
- Quality charts
- Email delivery
- Slack integration
- Advanced automations, webhooks, mobile apps

## Required Routes

- `/` -> dashboard
- `/issues` and `/issues/[issueKey]`
- `/projects` and `/projects/[projectKey]`
- `/teams`
- `/notifications`
- Clerk auth routes via middleware/components

## Data Model Minimum

- `User`: `id`, `clerkUserId` unique, `email`, `name`, `role`, timestamps
- `Team`: `id`, `key`, `name`, timestamps
- `TeamMember`: `id`, `teamId`, `userId`, unique(`teamId`,`userId`)
- `Project`: `id`, `key` unique, `name`, `description?`, `status`, `leadUserId?`, timestamps
- `ProjectMember`: `id`, `projectId`, `userId`, unique(`projectId`,`userId`)
- `Release`: `id`, `projectId`, `name`, `startsAt?`, `endsAt?`, timestamps
- `Label`: `id`, `name`, `color`, unique(`name`)
- `Issue`: `id`, `key` unique, `title`, `description?`, `status`, `priority`, `dueDate?`, `teamId`, `projectId?`, `assigneeUserId?`, `labelId?`, timestamps
- `IssueDependency`: `id`, `issueId`, `blockedByIssueId`, unique(`issueId`,`blockedByIssueId`)
- `IssueComment`: `id`, `issueId`, `authorUserId`, `body`, timestamps
- `ProjectComment`: `id`, `projectId`, `authorUserId`, `body`, timestamps
- `CommentMention`: `id`, `commentType(ISSUE|PROJECT)`, `commentId`, `mentionedUserId?`, `mentionedIssueId?`, `mentionedProjectId?`, timestamps
- `Notification`: `id`, `userId`, `type`, `title`, `body`, `linkUrl`, `readAt?`, timestamps

## API Requirements

- Issues: CRUD, list/filter, dependency add/remove, comments CRUD + mention extraction
- Projects: CRUD, release CRUD, membership CRUD, comments CRUD + mention extraction
- Teams: CRUD + membership CRUD
- Labels: CRUD
- Notifications: list, mark read/unread, mark all read

## URL / Key Rules

- Issue keys follow `TEAM-<number>` (example: `ENG-42`)
- Project keys are slug-like uppercase identifiers (example: `CORE-PLATFORM`)
- Keys are immutable after creation

## Access Rules

- All app routes require authenticated Clerk session
- `ADMIN` can access all teams/projects/issues
- `MEMBER` can access items only if:
  - they are team member, or
  - project member, or
  - direct assignee

## Testing Requirements

- Unit:
  - issue key generation
  - dependency validation (no self-dependency, no duplicates)
  - access-control guards
- Integration:
  - issue/project/team CRUD
  - assignment and dependency flows
  - mention parsing and notification generation from comments
  - in-app notification generation
- E2E:
  - admin creates team, project, label, issue
  - member updates assigned issue and comments with mentions
  - dashboard reflects project/issue progress

## Definition of Done

- All required routes + APIs implemented
- Clerk GitHub SSO works in local/dev and production pattern
- Judging-rubric features covered within the reduced scope
- Tests pass in CI-like local run
- Docs are sufficient for another agent to build from scratch
