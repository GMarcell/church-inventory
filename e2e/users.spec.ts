import { test, expect } from "@playwright/test";

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
  });

  test("admin can navigate to users page", async ({ page }) => {
    await page.getByRole("link", { name: "Users" }).click();
    await page.waitForURL("/users");
    await expect(page.getByText("User Management")).toBeVisible();
  });

  test("users page shows all users", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText("admin@test.com")).toBeVisible();
    await expect(page.getByText("editor@test.com")).toBeVisible();
    await expect(page.getByText("viewer@test.com")).toBeVisible();
  });

  test("admin user's role dropdown is disabled (self)", async ({ page }) => {
    await page.goto("/users");
    const adminRow = page.locator("tr", { hasText: "admin@test.com" });
    const adminSelect = adminRow.locator("select");
    await expect(adminSelect).toBeDisabled();
  });

  test("admin can change another user's role", async ({ page }) => {
    await page.goto("/users");

    // Find the editor user's row and change role to viewer
    const editorRow = page.locator("tr", { hasText: "editor@test.com" });
    const editorSelect = editorRow.locator("select");
    await editorSelect.selectOption("viewer");

    // Click Save
    await editorRow.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(500);

    // Verify the change persisted
    await expect(editorRow.locator("select")).toHaveValue("viewer");

    // Change back to editor
    await editorSelect.selectOption("editor");
    await editorRow.getByRole("button", { name: "Save" }).click();
    await page.waitForTimeout(500);
    await expect(editorRow.locator("select")).toHaveValue("editor");
  });

  test("delete button is hidden for current admin user", async ({ page }) => {
    await page.goto("/users");
    const adminRow = page.locator("tr", { hasText: "admin@test.com" });
    await expect(adminRow.getByRole("button", { name: "Delete" })).not.toBeVisible();
  });

  test("delete button is visible for other users", async ({ page }) => {
    await page.goto("/users");
    const editorRow = page.locator("tr", { hasText: "editor@test.com" });
    await expect(editorRow.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("shows role descriptions section", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText("Role Descriptions")).toBeVisible();
    await expect(page.getByText("Admin")).toBeVisible();
    await expect(page.getByText("Editor")).toBeVisible();
    await expect(page.getByText("Viewer")).toBeVisible();
  });

  test("non-admin users are redirected from users page", async ({ page }) => {
    // Logout and login as editor
    await page.getByTitle("Sign out").click();
    await page.waitForURL("/login");

    await page.getByLabel("Email").fill("editor@test.com");
    await page.getByLabel("Password").fill("editor123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");

    // Try to access users page
    await page.goto("/users");
    // Should be redirected back to home
    await expect(page).toHaveURL("/");
  });
});
