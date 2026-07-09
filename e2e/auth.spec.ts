import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Church Inventory")).toBeVisible();
    await expect(page.getByText("Sign in to manage your inventory")).toBeVisible();
  });

  test("shows login form with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("shows error with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@test.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("logs in with valid admin credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
    await expect(page.getByText("Church Inventory Manager")).toBeVisible();
    await expect(page.getByText("admin")).toBeVisible();
  });

  test("logs in with valid editor credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("editor@test.com");
    await page.getByLabel("Password").fill("editor123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
    await expect(page.getByText("Church Inventory Manager")).toBeVisible();
    await expect(page.getByText("editor")).toBeVisible();
  });

  test("logs in with valid viewer credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("viewer@test.com");
    await page.getByLabel("Password").fill("viewer123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");
    await expect(page.getByText("Church Inventory Manager")).toBeVisible();
    await expect(page.getByText("viewer")).toBeVisible();
  });

  test("redirects to login page after logout", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");

    // Click logout
    await page.getByTitle("Sign out").click();
    await page.waitForURL("/login");
    await expect(page.getByText("Sign in to manage your inventory")).toBeVisible();
  });

  test("has navigation to register page from login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Create one" })).toBeVisible();
    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL("/register");
    await expect(page.getByText("Create Account")).toBeVisible();
  });

  test("redirects authenticated user away from login page", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");

    // Try to go to login page
    await page.goto("/login");
    await page.waitForURL("/");
    await expect(page.getByText("Church Inventory Manager")).toBeVisible();
  });

  test("shows user name and role badge when logged in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@test.com");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");

    await expect(page.getByText("Admin User")).toBeVisible();
    await expect(page.getByText("ADMIN")).toBeVisible();
  });
});
