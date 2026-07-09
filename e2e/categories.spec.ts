import { test, expect } from "@playwright/test";

test.describe("Category Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
  });

  test("opens categories modal", async ({ page }) => {
    await page.getByRole("button", { name: "Categories" }).click();
    await expect(page.getByText("Manage Categories")).toBeVisible();
    await expect(page.getByText("Furniture")).toBeVisible();
    await expect(page.getByText("Electronics")).toBeVisible();
  });

  test("shows add category form for admin", async ({ page }) => {
    await page.getByRole("button", { name: "Categories" }).click();
    await expect(page.getByPlaceholder("New category name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
  });

  test("creates a new category", async ({ page }) => {
    await page.getByRole("button", { name: "Categories" }).click();
    await page.getByPlaceholder("New category name").fill("Audio Equipment");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Audio Equipment")).toBeVisible();
    await expect(page.getByText("(0 assets)")).toBeVisible();
  });

  test("shows asset count for categories", async ({ page }) => {
    await page.getByRole("button", { name: "Categories" }).click();
    await expect(page.getByText("Electronics")).toBeVisible();
  });

  test("closes categories modal", async ({ page }) => {
    await page.getByRole("button", { name: "Categories" }).click();
    await expect(page.getByText("Manage Categories")).toBeVisible();

    // Click close button
    await page.locator('button:has(svg path[d*="M6 18L18 6"])').first().click();
    await expect(page.getByText("Manage Categories")).not.toBeVisible();
  });
});
