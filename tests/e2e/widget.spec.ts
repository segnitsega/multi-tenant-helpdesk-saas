import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const slug = process.env.E2E_WORKSPACE_SLUG ?? "demo";
const widgetKey = process.env.E2E_WIDGET_KEY;

test.describe("widget demo", () => {
  test.skip(
    !email || !password || !widgetKey,
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and E2E_WIDGET_KEY",
  );

  test("visitor message appears in the inbox as WIDGET", async ({
    page,
    browser,
  }) => {
    const host = await browser.newPage();
    await host.goto("/examples/widget-demo.html");
    await host.evaluate((key) => {
      const existing = document.querySelector("script[data-key]");
      if (existing) existing.setAttribute("data-key", key);
    }, widgetKey!);
    await host.reload();
    await host.getByRole("button", { name: /open chat/i }).click();

    const frame = host.frameLocator("iframe[title='Support chat']");
    await frame.getByPlaceholder(/name/i).fill("E2E Visitor");
    await frame.getByPlaceholder(/email/i).fill(`e2e-${Date.now()}@example.com`);
    const marker = `widget-e2e-${Date.now()}`;
    await frame.getByPlaceholder(/how can we help/i).fill(marker);
    await frame.getByRole("button", { name: /start chat/i }).click();
    await expect(frame.getByText(marker)).toBeVisible({ timeout: 15_000 });

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(new RegExp(`/w/${slug}`));
    await page.goto(`/w/${slug}/inbox`);
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });
});
