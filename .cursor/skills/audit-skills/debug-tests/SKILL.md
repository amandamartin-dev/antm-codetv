---
name: debug-tests
description: Debug Playwright failures using fresh sub-agents, optional parallelism for independent failures, and --dry-run/--debug visibility.
---

# Debug Tests Orchestrator

Run a retry loop that fixes failing Playwright tests with fresh worker context.

## Invocation

- `/debug-tests` -> configure + execute
- `/debug-tests -in` -> interactive mode
- `/debug-tests -auto` -> unattended mode
- `/debug-tests --dry-run` -> configure + discover failures + show worker plan only
- `/debug-tests --debug` -> execute with prompt/worker-trace logging
- `/debug-tests --dry-run --debug` -> show worker plan + debug log paths only

## Core behavior and guarantees

- Main context is orchestrator only.
- Every fix attempt is done by fresh sub-agent worker(s).
- Workers receive focused failure handoff.
- Independent failures may run in parallel.
- Coupled failures run sequentially.

Do not directly apply failure fixes in the orchestrator context.

## Configuration inputs (AskQuestion)

At start, ask:

1. mode:
   - interactive
   - auto
2. session behavior (if `.cursor/debug-session.json` exists):
   - resume
   - fresh
3. worker model tier:
   - default
   - fast
4. max retries:
   - 2
   - 3
   - 5

Derived runtime values:

- `MODE`
- `MAX_RETRIES`
- `WORKER_MODEL`
- `STATE_FILE = .cursor/debug-session.json`
- `DEBUG_MODE` (true if `--debug` is present)

## Phase 0 - Session bootstrap

- If state exists and user chose resume, continue from last completed attempt.
- If user chose fresh, reset state and start at attempt 1.
- If no state exists, start at attempt 1.

## Phase 1 - Run tests + parse failures

1. Run:
   ```bash
   npx playwright test --project=chromium 2>&1
   ```
2. Read `test-results.json`.
3. Extract failed/timedOut results via `suites[].specs[].tests[].results[]`.
4. For each failing result, collect:
   - suite/spec title and test title
   - spec file path + line (if present)
   - status + duration
   - `error.message`, `error.stack`, `error.snippet`
   - attachment paths if present
5. If no failures:
   - report success
   - delete `STATE_FILE` if present
   - stop

## Phase 2 - Classify failures

Classify each failure as:
- **independent**: different files, or unrelated tests with no shared setup.
- **coupled**: same describe/setup path, shared fixtures/state, order-sensitive failures.

Prepare worker handoff per failure:
- failing test identity
- file and line
- error summary
- prior attempt history
- likely relevant app/test file paths

Worker prompt template:

```text
You are a focused test-debug worker.

Failure:
- title: [title]
- spec: [file:line]
- status: [status]
- error: [message]
- stack/snippet: [trimmed]
- prior attempts: [history]

Tasks:
1) Read relevant test and app files.
2) Identify root cause.
3) Apply one concrete fix.
4) Return:
   - rootCause
   - fixSummary
   - filesChanged
   - why this fix should resolve the failure

If debug mode is enabled:
5) Write an execution trace to: [debugExecutionPath]
6) Include:
   - ## Received Context (exact worker prompt)
   - ## Files Read
   - ## Root Cause Analysis
   - ## Fix Applied
   - ## Validation Reasoning
   - ## Final Output
```

Debug paths per worker (when `--debug`):
- `debugPromptPath`: `.cursor/debug-logs/[timestamp]-attempt-[N]-[failureSlug]-prompt.md`
- `debugExecutionPath`: `.cursor/debug-logs/[timestamp]-attempt-[N]-[failureSlug]-execution.md`

If `--debug` is present, orchestrator must:
1. Ensure `.cursor/debug-logs/` exists.
2. Resolve each worker prompt with concrete failure details.
3. Write each resolved prompt to `[debugPromptPath]`.
4. Print each resolved prompt in chat before worker launch.

## Phase 3 - Dry-run behavior

If `--dry-run` is present:
- do not spawn workers
- print mode, retries, worker model, failures, batching strategy, and debug paths
- end with: `No workers were launched. Remove --dry-run to execute.`

## Phase 4 - Fix loop with workers

If not dry-run:
1. If `--debug`, ensure `.cursor/debug-logs/` exists and write/print resolved prompts before each worker launch.
2. Spawn workers for independent failures in parallel batches (max 4 concurrent).
3. Process coupled failures sequentially (one worker at a time).
4. Store fix summaries in session history.

## Phase 5 - Re-run + mode control

1. Re-run:
   ```bash
   npx playwright test --project=chromium 2>&1
   ```
2. Increment attempt counter.
3. Update `STATE_FILE` with retries, attempts, failures, fix summaries, and remaining failures.
4. Re-read `test-results.json` and compare with previous attempt.

### Stop conditions
1. all pass
2. `attempt >= MAX_RETRIES`
3. no-progress guard (same failure set repeats)

### Interactive mode prompt
In `-in` mode, after each failed attempt:
- `continue` -> next interactive attempt
- `auto` -> switch to unattended mode
- `stop` -> end and print final summary

Remind user:
`To switch models: change the model in the Cursor dropdown, then reply continue.`

## Phase 6 - Final report

Print:
- attempts used / max retries
- what was fixed per test and attempt
- remaining failures and current error summary
- recommended next steps
- stop reason (pass, max retries, no-progress, or user stop)
- execution shape (parallel groups vs sequential)
- model tier used
- debug log paths (when `--debug`)

Delete `STATE_FILE` if session is complete.

## Important constraints

- Do not call external LLM APIs.
- Do not create custom Node helper scripts for parsing failures.
- Use Playwright JSON output (`test-results.json`).
- Preserve fresh worker context on every retry.
- If interrupted mid-attempt, resume from `lastCompletedAttempt` and re-run tests before continuing.
