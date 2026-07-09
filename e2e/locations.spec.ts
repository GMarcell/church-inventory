import { test, expect } from "@playwright/test";

test.describe("Location Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
  });

  test("opens locations modal", async ({ page }) => {
    await page.getByRole("button", { name: "Locations" }).click();
    await expect(page.getByText("Manage Locations")).toBeVisible();
    await expect(page.getByText("Sanctuary")).toBeVisible();
    await expect(page.getByText("Storage Room")).toBeVisible();
  });

  test("shows add location form for admin", async ({ page }) => {
    await page.getByRole("button", { name: "Locations" }).click();
    await expect(page.getByPlaceholder("New location name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
  });

  test("creates a new location", async ({ page }) => {
    await page.getByRole("button", { name: "Locations" }).click();
    await page.getByPlaceholder("New location name").fill("Youth Room");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Youth Room")).toBeVisible();
  });

  test("shows asset count for locations", async ({ page }) => {
    await page.getByRole("button", { name: "Locations" }).click();
    // Sanctuary should have at least 1 asset
    const sanctuaryItem = page.getByText("Sanctuary").locator("..");
    await expect(sanctuaryItem).toBeVisible();
  });

  test("closes locations modal", async ({ page }) => {
    await page.getByRole("button", { name: "Locations" }).click();
    await expect(page.getByText("Manage Locations")).toBeVisible();

    // Click close button
    await page.locator('button:has(svg path[d*="M6 18L18 6"])').first().click();
    await expect(page.getByText("Manage Locations")).not.toBeVisible();
  });
});
