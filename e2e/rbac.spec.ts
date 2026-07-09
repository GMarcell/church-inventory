import { test, expect } from "@playwright/test";

test.describe("RBAC Enforcement", () => {
  test.describe("Admin permissions", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("admin@test.com");
      await page.getByLabel("Password").fill("admin123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("/");
    });

    test("admin sees all action buttons on asset cards", async ({ page }) => {
      const firstCard = page.locator('div:has(h3:text("Wooden Pews"))');
      await expect(firstCard.getByRole("button", { name: "Barcode" })).toBeVisible();
      // Edit button (has pencil icon path)
      await expect(firstCard.locator('button:has(svg path[d*="M11 5H6"])')).toBeVisible();
      // Delete button (has trash icon path)
      await expect(firstCard.locator('button:has(svg path[d*="M19 7l-.867"])')).toBeVisible();
    });

    test("admin sees Add Asset, Categories, Locations, and Users buttons in header", async ({ page }) => {
      await expect(page.getByRole("button", { name: "+ Add Asset" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Categories" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Locations" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    });

    test("admin can access users management page", async ({ page }) => {
      await page.getByRole("link", { name: "Users" }).click();
      await page.waitForURL("/users");
      await expect(page.getByText("User Management")).toBeVisible();
    });

    test("admin sees add form in categories modal", async ({ page }) => {
      await page.getByRole("button", { name: "Categories" }).click();
      await expect(page.getByPlaceholder("New category name")).toBeVisible();
      await expect(page.getByRole("button", { name: "Add", exact: true })).toBeVisible();
    });

    test("admin sees add form in locations modal", async ({ page }) => {
      await page.getByRole("button", { name: "Locations" }).click();
      await expect(page.getByPlaceholder("New location name")).toBeVisible();
    });
  });

  test.describe("Editor permissions", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("editor@test.com");
      await page.getByLabel("Password").fill("editor123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("/");
    });

    test("editor sees edit button but not delete button on asset cards", async ({ page }) => {
      const firstCard = page.locator('div:has(h3:text("Wooden Pews"))');
      // Edit button should be visible
      await expect(firstCard.locator('button:has(svg path[d*="M11 5H6"])')).toBeVisible();
      // Delete button should NOT be visible
      await expect(firstCard.locator('button:has(svg path[d*="M19 7l-.867"])')).not.toBeVisible();
    });

    test("editor sees Add Asset, Categories, Locations buttons but NOT Users link", async ({ page }) => {
      await expect(page.getByRole("button", { name: "+ Add Asset" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Categories" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Locations" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
    });

    test("editor can create a new asset", async ({ page }) => {
      await page.getByRole("button", { name: "+ Add Asset" }).click();
      await page.getByPlaceholder("Asset name").fill("Editor Created Asset");
      await page.getByRole("button", { name: "Generate", exact: true }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Add Asset" }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("Editor Created Asset")).toBeVisible();
    });

    test("editor sees add form in categories modal", async ({ page }) => {
      await page.getByRole("button", { name: "Categories" }).click();
      await expect(page.getByPlaceholder("New category name")).toBeVisible();
    });

    test("editor cannot access users management page", async ({ page }) => {
      await page.goto("/users");
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Viewer permissions", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("viewer@test.com");
      await page.getByLabel("Password").fill("viewer123");
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("/");
    });

    test("viewer does NOT see Add Asset, Edit, or Delete buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: "+ Add Asset" })).not.toBeVisible();
      await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Categories" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Locations" })).toBeVisible();
    });

    test("viewer sees asset cards but no action buttons", async ({ page }) => {
      await expect(page.getByText("Wooden Pews")).toBeVisible();
      await expect(page.getByText("Sound System")).toBeVisible();

      const firstCard = page.locator('div:has(h3:text("Wooden Pews"))');
      await expect(firstCard.getByRole("button", { name: "Barcode" })).toBeVisible();
      await expect(firstCard.locator('button:has(svg path[d*="M11 5H6"])')).not.toBeVisible();
      await expect(firstCard.locator('button:has(svg path[d*="M19 7l-.867"])')).not.toBeVisible();
    });

    test("viewer does NOT see add form in categories modal", async ({ page }) => {
      await page.getByRole("button", { name: "Categories" }).click();
      await expect(page.getByPlaceholder("New category name")).not.toBeVisible();
    });

    test("viewer does NOT see add form in locations modal", async ({ page }) => {
      await page.getByRole("button", { name: "Locations" }).click();
      await expect(page.getByPlaceholder("New location name")).not.toBeVisible();
    });

    test("viewer sees correct role badge", async ({ page }) => {
      await expect(page.getByText("VIEWER")).toBeVisible();
    });

    test("viewer cannot access users page", async ({ page }) => {
      await page.goto("/users");
      await expect(page).toHaveURL("/");
    });
  });
});
