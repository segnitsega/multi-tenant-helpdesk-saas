import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const slug = process.env.E2E_WORKSPACE_SLUG ?? "acme";

test.describe("realtime inbox", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test("reply in one browser appears in another", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();

    async function login(page: typeof pageA) {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email!);
      await page.getByLabel(/password/i).fill(password!);
      await page.getByRole("button", { name: /sign in|log in/i }).click();
      await page.waitForURL(new RegExp(`/w/${slug}`));
    }

    await login(pageA);
    await login(pageB);

    await pageA.goto(`/w/${slug}/inbox`);
    await pageB.goto(`/w/${slug}/inbox`);

    const firstTicket = pageA.locator("a[href*='/inbox/']").first();
    await expect(firstTicket).toBeVisible({ timeout: 15_000 });
    const href = await firstTicket.getAttribute("href");
    expect(href).toBeTruthy();

    await pageA.goto(href!);
    await pageB.goto(href!);

    const marker = `realtime-${Date.now()}`;
    await pageA.getByRole("tab", { name: /reply/i }).click();
    await pageA.locator(".ProseMirror").click();
    await pageA.keyboard.type(marker);
    await pageA.getByRole("button", { name: /^send$/i }).click();

    await expect(pageB.getByText(marker)).toBeVisible({ timeout: 20_000 });

    await a.close();
    await b.close();
  });
});
