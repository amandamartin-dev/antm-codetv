# Linear-Style MVP Checklist

## Product Scope Gates

- [ ] Single workspace model only
- [ ] Clerk auth enabled with GitHub SSO
- [ ] Issues support CRUD, single assignee, team/project assignment, due date, dependencies, URL key
- [ ] Labels implemented as optional single label per issue (not many-to-many)
- [ ] Issue comments support mentions (`@user`, `#issue`, `~project`)
- [ ] Projects support CRUD, URL key, release grouping
- [ ] No roadmap assignment feature
- [ ] Users can belong to teams and projects
- [ ] Access control roles: `ADMIN`, `MEMBER`
- [ ] Dashboard includes project/issue progress visualization
- [ ] Dashboard includes in-app notifications inbox
- [ ] No velocity chart
- [ ] No quality chart
- [ ] No email notifications
- [ ] No Slack integration

## Engineering Gates

- [ ] Next.js `16.x` App Router with TypeScript
- [ ] Prisma + Postgres schema matches spec
- [ ] Zod validation on mutation endpoints
- [ ] Server-side authz checks on all protected APIs
- [ ] Stable issue/project key generation
- [ ] Dependency edge constraints enforced
- [ ] Comment mention parsing and mention reference validation enforced

## QA Gates

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E happy path passes
- [ ] Dashboard values match DB-backed data
- [ ] Notification read/unread behavior verified
- [ ] Mention-triggered notifications verified

## Doc Gates

- [ ] README points to spec/runbook/checklist
- [ ] Spec and runbook are sufficient for a new agent to implement from scratch
- [ ] Out-of-scope list is explicit and enforced
