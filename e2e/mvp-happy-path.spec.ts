import { expect, request as playwrightRequest, test } from "@playwright/test";

test.skip(process.env.RUN_E2E !== "1", "Set RUN_E2E=1 to execute E2E tests");

test("admin creates core entities, member updates issue, dashboard reflects progress", async ({
  page,
  request,
}) => {
  const runId = `e2e-${Date.now()}`;
  const teamKey = `E2E${runId.slice(-4).toUpperCase()}`;
  const projectKey = `E2E-${runId.slice(-4).toUpperCase()}`;
  const memberClerkUserId = `member-${runId}`;
  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

  const adminMeResponse = await request.get("/api/me");
  expect(adminMeResponse.ok()).toBeTruthy();
  const adminMePayload = (await adminMeResponse.json()) as {
    data: { id: string; clerkUserId: string };
  };

  const memberContext = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-dev-user-id": memberClerkUserId,
    },
  });

  const memberMeResponse = await memberContext.get("/api/me");
  expect(memberMeResponse.ok()).toBeTruthy();
  const memberMePayload = (await memberMeResponse.json()) as { data: { id: string } };

  const teamResponse = await request.post("/api/teams", {
    data: {
      key: teamKey,
      name: `Team ${runId}`,
    },
  });
  expect(teamResponse.ok()).toBeTruthy();
  const teamPayload = (await teamResponse.json()) as { data: { id: string } };

  await request.post(`/api/teams/${teamPayload.data.id}/members`, {
    data: {
      clerkUserId: memberClerkUserId,
    },
  });

  const projectResponse = await request.post("/api/projects", {
    data: {
      key: projectKey,
      name: `Project ${runId}`,
      description: "e2e project",
      status: "ACTIVE",
      leadUserId: adminMePayload.data.id,
      memberIds: [adminMePayload.data.id, memberMePayload.data.id],
    },
  });
  expect(projectResponse.ok()).toBeTruthy();
  const projectPayload = (await projectResponse.json()) as { data: { id: string } };

  const labelResponse = await request.post("/api/labels", {
    data: {
      name: `label-${runId}`,
      color: "#f97316",
    },
  });
  expect(labelResponse.ok()).toBeTruthy();
  const labelPayload = (await labelResponse.json()) as { data: { id: string } };

  const issueResponse = await request.post("/api/issues", {
    data: {
      title: `Issue ${runId}`,
      description: "e2e issue",
      status: "TODO",
      priority: "HIGH",
      teamId: teamPayload.data.id,
      projectId: projectPayload.data.id,
      assigneeClerkUserId: memberClerkUserId,
      labelId: labelPayload.data.id,
    },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issuePayload = (await issueResponse.json()) as {
    data: { id: string; key: string };
  };

  const memberIssuePatch = await memberContext.patch(`/api/issues/${issuePayload.data.id}`, {
    data: {
      status: "DONE",
    },
  });
  expect(memberIssuePatch.ok()).toBeTruthy();

  const memberComment = await memberContext.post(`/api/issues/${issuePayload.data.id}/comments`, {
    data: {
      body: `@${adminMePayload.data.clerkUserId} #${issuePayload.data.key} ~${projectKey}`,
    },
  });
  expect(memberComment.ok()).toBeTruthy();

  const notificationResponse = await request.get("/api/notifications");
  const notificationPayload = (await notificationResponse.json()) as {
    data: Array<{ type: string; linkUrl: string }>;
  };

  expect(
    notificationPayload.data.some(
      (notification) => notification.type === "MENTION" && notification.linkUrl === `/issues/${issuePayload.data.key}`,
    ),
  ).toBeTruthy();

  await page.goto("/");
  await expect(page.getByText("Dashboard")).toBeVisible();
  await expect(page.getByText(projectKey)).toBeVisible();

  await memberContext.dispose();
});
