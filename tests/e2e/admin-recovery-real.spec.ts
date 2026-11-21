import { expect, test } from "@playwright/test";

test("recovery fails closed without server configuration and refuses unauthorized updates", async ({
  page,
}) => {
  // The CI server has no Supabase credentials or allowlisted administrator.
  // Exercise the real API, not a mocked recovery success or a production user.
  await page.goto("/reset-password");
  await page.getByLabel("Administrator email").fill("owner@example.test");
  const pendingRequest = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/admin/auth/recovery") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Send recovery email" }).click();
  const response = await pendingRequest;
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({
    error: "Recovery is temporarily unavailable.",
  });
  await expect(page.getByRole("status")).toHaveText(
    "Recovery is temporarily unavailable.",
  );

  const update = await page.evaluate(async () => {
    const response = await fetch("/api/admin/auth/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        password: "ExamplePassword123",
        confirm: "ExamplePassword123",
      }),
    });
    return { status: response.status, body: await response.json() };
  });
  expect(update.status).toBe(401);
  expect(update.body.error).toContain("invalid or expired");
  await expect(
    page.getByRole("link", { name: "Back to administrator sign in" }),
  ).toHaveAttribute("href", "/admin/login");
});
