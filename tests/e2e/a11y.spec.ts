import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const slug = process.env.E2E_WORKSPACE_SLUG ?? "demo";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(new RegExp(`/w/${slug}|/onboarding`));
}

async function expectNoCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const critical = results.violations.filter(
    (row) => row.impact === "critical" || row.impact === "serious",
  );
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
}

test.describe("accessibility", () => {
  test("login page has no critical axe issues", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible();
    await expectNoCriticalViolations(page);
  });

  test("landing page has no critical axe issues", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoCriticalViolations(page);
  });

  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test("authenticated shell pages have no critical axe issues", async ({
    page,
  }) => {
    await login(page);

    for (const path of [
      `/w/${slug}/inbox`,
      `/w/${slug}/settings/general`,
      `/w/${slug}/settings/billing`,
      `/w/${slug}/analytics`,
    ]) {
      await page.goto(path);
      await expectNoCriticalViolations(page);
    }
  });
});
