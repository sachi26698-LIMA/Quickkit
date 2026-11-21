import { expect, test } from "@playwright/test";

test("recovery request and password update forms work with isolated API responses", async ({
  page,
}) => {
  let valid = false;
  const actions: string[] = [];
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/admin/auth/recovery"))
      failures.push(request.failure()?.errorText ?? "request failed");
  });
  await page.route("**/api/admin/auth/recovery", async (route) => {
    try {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ json: { valid } });
        return;
      }
      const body = request.postDataJSON();
      actions.push(body.action);
      await route.fulfill({ json: { ok: true } });
    } catch (error) {
      failures.push(`route handler: ${String(error)}`);
      await route.abort();
    }
  });
  await page.goto("/reset-password");
  await page.getByLabel("Administrator email").fill("owner@example.test");
  await page.getByRole("button", { name: "Send recovery email" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(failures, `Recovery request failures: ${failures.join(", ")}`).toEqual(
    [],
  );
  expect(
    actions,
    `Recovery API POST must reach the isolated route; browser errors: ${consoleErrors.join("; ")}`,
  ).toEqual(["request"]);
  await expect(page.getByRole("status")).toContainText(
    "If this address is eligible",
  );

  valid = true;
  await page.reload();
  await page
    .getByLabel("New password", { exact: true })
    .fill("ExamplePassword123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("DifferentPassword123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toHaveText("Passwords do not match.");
  expect(actions).toEqual(["request"]);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("ExamplePassword123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your password has been updated",
  );
  expect(actions).toEqual(["request", "update"]);
  await expect(
    page.getByRole("link", { name: "Back to administrator sign in" }),
  ).toHaveAttribute("href", "/admin/login");
});
