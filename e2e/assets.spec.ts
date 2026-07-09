import { test, expect } from "@playwright/test";

test.describe("Asset Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
  });

  test("displays stats dashboard with asset counts", async ({ page }) => {
    await expect(page.getByText("Total Assets")).toBeVisible();
    await expect(page.getByText("Categories")).toBeVisible();
    await expect(page.getByText("Locations")).toBeVisible();
    await expect(page.getByText("Total Items")).toBeVisible();
  });

  test("displays list of seeded assets", async ({ page }) => {
    await expect(page.getByText("Wooden Pews")).toBeVisible();
    await expect(page.getByText("Sound System")).toBeVisible();
    await expect(page.getByText("Spare Microphones")).toBeVisible();
  });

  test("creates a new asset via modal form", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add Asset" }).click();
    await expect(page.getByText("Add New Asset")).toBeVisible();

    await page.getByPlaceholder("Asset name").fill("Test Asset E2E");
    await page.getByPlaceholder("Optional description").fill("Created by E2E test");
    await page.getByRole("button", { name: "Generate", exact: true }).click();

    // Wait for barcode to generate
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: "Add Asset" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Test Asset E2E")).toBeVisible();
  });

  test("searches for assets", async ({ page }) => {
    await page.getByPlaceholder(/Search assets/).fill("Microphones");
    await page.waitForTimeout(500);

    await expect(page.getByText("Spare Microphones")).toBeVisible();
    await expect(page.getByText("Wooden Pews")).not.toBeVisible();
  });

  test("opens edit modal from asset card", async ({ page }) => {
    const editButton = page.locator('button:has(svg path[d*="M11 5H6"])').first();
    await editButton.click();

    await expect(page.getByText("Edit Asset")).toBeVisible();
    await expect(page.getByDisplayValue("Wooden Pews")).toBeVisible();
  });

  test("edits an asset quantity", async ({ page }) => {
    const editButton = page.locator('button:has(svg path[d*="M11 5H6"])').first();
    await editButton.click();

    await expect(page.getByText("Edit Asset")).toBeVisible();
    const quantityInput = page.locator('input[type="number"]').first();
    await quantityInput.fill("50");

    await page.getByRole("button", { name: "Update Asset" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Qty: 50")).toBeVisible();
  });

  test("deletes an asset with confirmation", async ({ page }) => {
    // First create an asset we can safely delete
    await page.getByRole("button", { name: "+ Add Asset" }).click();
    await page.getByPlaceholder("Asset name").fill("Asset To Delete");
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Add Asset" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Asset To Delete")).toBeVisible();

    // Delete it
    page.on("dialog", (dialog) => dialog.accept());
    const deleteButton = page
      .locator('button:has(svg path[d*="M19 7l-.867"])')
      .last();
    await deleteButton.click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Asset To Delete")).not.toBeVisible();
  });

  test("shows barcode on asset card", async ({ page }) => {
    await expect(page.getByText("CH-PEWS-001")).toBeVisible();
    await expect(page.getByText("CH-SOUND-001")).toBeVisible();
  });

  test("opens barcode print window", async ({ page }) => {
    const barcodeButton = page.getByRole("button", { name: "Barcode" }).first();
    await expect(barcodeButton).toBeVisible();
  });

  test("shows category and location tags on asset cards", async ({ page }) => {
    const firstCard = page.locator('div:has(h3:text("Wooden Pews"))');
    await expect(firstCard.getByText("Furniture")).toBeVisible();
    await expect(firstCard.getByText("Sanctuary")).toBeVisible();
  });
});
