import { expect, request as playwrightRequest, test } from "@playwright/test";

test.skip(process.env.RUN_E2E !== "1", "Set RUN_E2E=1 to execute E2E tests");

test("one user creates core entities, another user updates issue, dashboard reflects progress", async ({
  page,
  request,
}) => {
  const runId = `e2e-${Date.now()}`;
  const teamKey = `E2E${runId.slice(-4).toUpperCase()}`;
  const projectKey = `E2E-${runId.slice(-4).toUpperCase()}`;
  const secondUserClerkUserId = `user-b-${runId}`;
  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

  const firstUserMeResponse = await request.get("/api/me");
  expect(firstUserMeResponse.ok()).toBeTruthy();
  const firstUserMePayload = (await firstUserMeResponse.json()) as {
    data: { id: string; clerkUserId: string };
  };

  const secondUserContext = await playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-dev-user-id": secondUserClerkUserId,
    },
  });

  const secondUserMeResponse = await secondUserContext.get("/api/me");
  expect(secondUserMeResponse.ok()).toBeTruthy();
  const secondUserMePayload = (await secondUserMeResponse.json()) as { data: { id: string } };

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
      clerkUserId: secondUserClerkUserId,
    },
  });

  const projectResponse = await request.post("/api/projects", {
    data: {
      key: projectKey,
      name: `Project ${runId}`,
      description: "e2e project",
      status: "ACTIVE",
      leadUserId: firstUserMePayload.data.id,
      memberIds: [firstUserMePayload.data.id, secondUserMePayload.data.id],
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
      assigneeClerkUserId: secondUserClerkUserId,
      labelId: labelPayload.data.id,
    },
  });
  expect(issueResponse.ok()).toBeTruthy();
  const issuePayload = (await issueResponse.json()) as {
    data: { id: string; key: string };
  };

  const secondUserIssuePatch = await secondUserContext.patch(`/api/issues/${issuePayload.data.id}`, {
    data: {
      status: "DONE",
    },
  });
  expect(secondUserIssuePatch.ok()).toBeTruthy();

  const secondUserComment = await secondUserContext.post(`/api/issues/${issuePayload.data.id}/comments`, {
    data: {
      body: `@${firstUserMePayload.data.clerkUserId} #${issuePayload.data.key} ~${projectKey}`,
    },
  });
  expect(secondUserComment.ok()).toBeTruthy();

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

  await secondUserContext.dispose();
});
