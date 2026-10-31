import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const slug = process.env.E2E_WORKSPACE_SLUG ?? "acme";
const stripeReady = Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO,
);

test.describe("billing upgrade", () => {
  test.skip(
    !email || !password || !stripeReady,
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, STRIPE_SECRET_KEY, and STRIPE_PRICE_PRO",
  );

  test("owner can open checkout for Pro with the test card flow", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(new RegExp(`/w/${slug}`));

    await page.goto(`/w/${slug}/settings/billing`);
    await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible();

    await page.getByRole("button", { name: /upgrade to pro/i }).click();
    await page.waitForURL(/checkout\.stripe\.com|billing\.stripe\.com/, {
      timeout: 30_000,
    });

    await page.getByLabel(/card number/i).fill("4242424242424242");
    await page.getByLabel(/expiration/i).fill("1234");
    await page.getByLabel(/cvc/i).fill("123");
    await page.getByRole("button", { name: /pay|subscribe|start/i }).click();

    await page.waitForURL(new RegExp(`/w/${slug}/settings/billing`), {
      timeout: 60_000,
    });
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });
});
