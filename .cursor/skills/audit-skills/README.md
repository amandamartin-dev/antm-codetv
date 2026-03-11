# Cursor Skills Guide

This document covers every project skill in `.cursor/skills/` -- what each one does, how to invoke it in chat, and the recommended workflow that ties them together.

## How to invoke a skill

- Open Cursor Agent chat.
- Ask for the skill by name in your prompt (for example: "run `audit-all` on this file").
- For skills that need input, include it in the same message (for example: "`audit-a11y-browser` `http://localhost:3000/dashboard`").

## Quick reference

Skills listed in workflow order.

| Skill | Step | What it does | Recommended model |
|---|---|---|---|
| `audit-all` | 1 -- Audit | Runs selected audit roles and writes a consolidated report | Opus |
| `audit-principal` | 1 -- Audit | Architecture and code quality review | Opus |
| `audit-security` | 1 -- Audit | OWASP-focused security audit | Opus |
| `audit-devops` | 1 -- Audit | Production readiness and operability audit | Sonnet |
| `audit-a11y` | 1 -- Audit | WCAG code-level accessibility audit | Sonnet |
| `audit-a11y-browser` | 1 -- Audit | Live URL accessibility audit via Playwright + axe-core | Sonnet |
| `audit-dry` | 1 -- Audit | DRY/pattern duplication and abstraction audit | Sonnet |
| `generate-tests` | 2 -- Test generation | Generates complete Playwright e2e suite and setup | Opus |
| `debug-tests` | 3 -- Debug | Iterative Playwright failure debugging with resumable sessions | Sonnet/Opus as needed |

## Workflow

These skills are designed to work as a pipeline. Each step builds on output from the previous step.

```text
audit-all -> generate-tests -> debug-tests
```

**Step 1 -- Audit.** Start with `audit-all` to get a comprehensive picture across architecture, security, operations, accessibility, and code patterns. The consolidated report becomes input for downstream testing/debugging. Use individual skills (`audit-security`, `audit-devops`, etc.) when you only need one perspective.

**Step 2 -- Generate tests.** Run `generate-tests` after auditing so Playwright gates exist before code changes. This establishes a baseline and catches regressions quickly.

**Step 3 -- Debug.** After tests are generated, run `debug-tests` to iteratively fix failing Playwright tests. Each failure gets a fresh worker context; the loop continues until all tests pass or stop conditions are reached.

**Tips:**
- Use `audit-all` for periodic full-project quality gates.
- Keep `generate-tests` and `debug-tests` in the regular engineering loop.

---

## Skill details

### Step 1 -- Audit

#### `audit-all`

Orchestrates selected audit roles using fresh sub-agents and consolidates the results.

- **Scope:** Audits the active file if provided; otherwise audits full `src/`.
- **Interactive configuration:** Prompts for selected roles and model tier per role.
- **Execution:** Launches up to 4 concurrent workers. Each worker reads exactly one role skill and writes a role-specific report.
- **Output:**
  - Per-role reports at `audit-reports/AUDIT-[timestamp]/individual/[role].md`
  - Consolidated report at `audit-reports/AUDIT-[timestamp]/consolidated/CONSOLIDATED.md`
  - In-chat summary table with severity counts by role
- **Flags:**
  - `--dry-run` -- shows execution plan only (no workers launched)
  - `--debug` -- writes resolved prompts and worker traces to `audit-reports/AUDIT-[timestamp]/debug/`
- **Model recommendation:** Opus

#### `audit-principal`

Principal Engineer review focused on architecture, code quality, React/Next.js patterns, and tech debt.

- **Key checks:** Responsibility boundaries, hook correctness, server/client component usage, complexity flags, async patterns
- **Output:** Findings and `PRINCIPAL ENGINEER AUDIT` summary block
- **Model recommendation:** Opus

#### `audit-security`

Security audit aligned with OWASP Top 10.

- **Key checks:** Access control, cryptography, injection, insecure design/misconfiguration, auth/session handling
- **Output:** Confirmed security risks with OWASP mapping and summary block
- **Model recommendation:** Opus

#### `audit-devops`

DevOps/platform readiness audit for production reliability.

- **Key checks:** Logging/observability, resilience/timeouts, env/config validation, scalability, deployment hygiene
- **Output:** Operational risk findings and `DEVOPS AUDIT` summary block
- **Model recommendation:** Sonnet

#### `audit-a11y`

WCAG 2.1 AA accessibility audit for React/Next.js code.

- **Key checks:** Semantic HTML, ARIA, keyboard access, focus management, form/input assistance, live announcements
- **Output:** Accessibility findings with fix patterns and summary block
- **Model recommendation:** Sonnet

#### `audit-a11y-browser`

Live accessibility test against a running URL using Playwright and axe-core.

- **Usage:** `audit-a11y-browser http://localhost:3000` or `audit-a11y-browser http://localhost:3000/dashboard`
- **Key checks:** axe-core violations, tab order, modal focus trapping, skip links, `aria-live`, desktop/mobile viewport checks
- **Output:** In-chat summary and markdown report at `audit-reports/a11y-browser-[timestamp].md`
- **Model recommendation:** Sonnet

#### `audit-dry`

Finds duplication and abstraction opportunities.

- **Key checks:** DRY violations, extractable hooks/components/utils, repeated constants/routes/types/schemas
- **Output:** Actionable extraction suggestions and `DRY / PATTERNS AUDIT` summary block
- **Model recommendation:** Sonnet

---

### Step 2 -- Test generation

#### `generate-tests`

Generates a full Playwright e2e suite for a Next.js app.

- **Discovery:** Reads route/component/backend structure, latest audit report, and existing tests
- **Workflow:** Produces a test plan first, waits for confirmation, then generates config/setup/specs/checklists
- **Expected outputs:**
  - `playwright.config.ts` setup
  - Auth bootstrap (`e2e/global.setup.ts`, `.env.test`, helpers)
  - Spec files for key domains (security/accessibility/edge/error handling), adapted to the app
  - Verification checklist and run instructions
- **Model recommendation:** Opus

---

### Step 3 -- Debugging

#### `debug-tests`

Runs a retry loop that fixes failing Playwright tests using fresh workers with focused context.

- **Interactive configuration:** Prompts for mode (interactive/auto), session behavior (resume/fresh), worker model tier, and max retries
- **Invocation shortcuts:**
  - `debug-tests` -- starts with interactive configuration
  - `debug-tests -in` -- interactive mode (pause each failed attempt)
  - `debug-tests -auto` -- unattended mode
- **Core behavior:**
  - Runs Playwright, reads `test-results.json`, classifies failures as independent vs coupled
  - Independent failures fixed in parallel (max 4); coupled failures fixed sequentially
  - Re-runs suite after fixes and compares progress per attempt
- **Interactive controls:** `continue`, `auto`, or `stop` after each failed attempt
- **Session resume:** Uses `.cursor/debug-session.json` to continue from the last completed attempt
- **Flags:**
  - `--dry-run` -- show worker plan without launching workers
  - `--debug` -- write prompt and execution traces to `.cursor/debug-logs/`
- **Output:** Final report with attempts used, fixes, remaining failures, and next steps

---

## Troubleshooting

- **`test-results.json` missing:** Run `npx playwright test --project=chromium` and verify reporter config in `playwright.config.ts`.
- **Stale debug session:** Choose `fresh` in `debug-tests`, or delete `.cursor/debug-session.json`.
- **Visual failure context:** Run `npx playwright show-report`.
- **Audit workers not spawning:** If `audit-all` returns only in-chat output and no report files, workers were not launched. Re-run and check for tool/model errors.

## `.cursor` folder reference

- **`.cursor/mcp.json`** -- Configures MCP servers. This repo points to Playwright MCP via `npx @playwright/mcp@latest`.
- **`.cursor/skills/`** -- Contains the 9 project skills documented above.
- **`.cursor/commands/`** -- Legacy command files retained for compatibility (deprecated in favor of skills).
- **`.cursor/debug-session.json`** -- Created by `debug-tests` to persist retry state across stops/resumes.
- **`.cursor/debug-logs/`** -- Created by `debug-tests --debug` runs. Contains resolved worker prompts and execution traces.
