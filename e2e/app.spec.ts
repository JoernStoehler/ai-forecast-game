import { expect, test } from "@playwright/test";

test("homepage has heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI Forecast Game");
});
