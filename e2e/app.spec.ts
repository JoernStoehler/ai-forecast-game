import { expect, test } from "@playwright/test";

test("homepage has heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading")).toContainText("AI Forecast Game");
});
