# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assets.spec.ts >> Asset Management >> displays stats dashboard with asset counts
- Location: e2e/assets.spec.ts:13:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
  navigated to "http://localhost:3000/api/auth/error"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "Server error" [level=1] [ref=e4]
  - generic [ref=e6]:
    - paragraph [ref=e7]: There is a problem with the server configuration.
    - paragraph [ref=e8]: Check the server logs for more information.
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Asset Management", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Login as admin
  6   |     await page.goto("/login");
  7   |     await page.getByLabel("Email").fill("admin@test.com");
  8   |     await page.getByLabel("Password").fill("admin123");
  9   |     await page.getByRole("button", { name: "Sign In" }).click();
> 10  |     await page.waitForURL("/");
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  11  |   });
  12  | 
  13  |   test("displays stats dashboard with asset counts", async ({ page }) => {
  14  |     await expect(page.getByText("Total Assets")).toBeVisible();
  15  |     await expect(page.getByText("Categories")).toBeVisible();
  16  |     await expect(page.getByText("Locations")).toBeVisible();
  17  |     await expect(page.getByText("Total Items")).toBeVisible();
  18  |   });
  19  | 
  20  |   test("displays list of seeded assets", async ({ page }) => {
  21  |     await expect(page.getByText("Wooden Pews")).toBeVisible();
  22  |     await expect(page.getByText("Sound System")).toBeVisible();
  23  |     await expect(page.getByText("Spare Microphones")).toBeVisible();
  24  |   });
  25  | 
  26  |   test("creates a new asset via modal form", async ({ page }) => {
  27  |     await page.getByRole("button", { name: "+ Add Asset" }).click();
  28  |     await expect(page.getByText("Add New Asset")).toBeVisible();
  29  | 
  30  |     await page.getByPlaceholder("Asset name").fill("Test Asset E2E");
  31  |     await page.getByPlaceholder("Optional description").fill("Created by E2E test");
  32  |     await page.getByRole("button", { name: "Generate", exact: true }).click();
  33  | 
  34  |     // Wait for barcode to generate
  35  |     await page.waitForTimeout(500);
  36  | 
  37  |     await page.getByRole("button", { name: "Add Asset" }).click();
  38  |     await page.waitForTimeout(500);
  39  | 
  40  |     await expect(page.getByText("Test Asset E2E")).toBeVisible();
  41  |   });
  42  | 
  43  |   test("searches for assets", async ({ page }) => {
  44  |     await page.getByPlaceholder(/Search assets/).fill("Microphones");
  45  |     await page.waitForTimeout(500);
  46  | 
  47  |     await expect(page.getByText("Spare Microphones")).toBeVisible();
  48  |     await expect(page.getByText("Wooden Pews")).not.toBeVisible();
  49  |   });
  50  | 
  51  |   test("opens edit modal from asset card", async ({ page }) => {
  52  |     const editButton = page.locator('button:has(svg path[d*="M11 5H6"])').first();
  53  |     await editButton.click();
  54  | 
  55  |     await expect(page.getByText("Edit Asset")).toBeVisible();
  56  |     await expect(page.getByDisplayValue("Wooden Pews")).toBeVisible();
  57  |   });
  58  | 
  59  |   test("edits an asset quantity", async ({ page }) => {
  60  |     const editButton = page.locator('button:has(svg path[d*="M11 5H6"])').first();
  61  |     await editButton.click();
  62  | 
  63  |     await expect(page.getByText("Edit Asset")).toBeVisible();
  64  |     const quantityInput = page.locator('input[type="number"]').first();
  65  |     await quantityInput.fill("50");
  66  | 
  67  |     await page.getByRole("button", { name: "Update Asset" }).click();
  68  |     await page.waitForTimeout(500);
  69  | 
  70  |     await expect(page.getByText("Qty: 50")).toBeVisible();
  71  |   });
  72  | 
  73  |   test("deletes an asset with confirmation", async ({ page }) => {
  74  |     // First create an asset we can safely delete
  75  |     await page.getByRole("button", { name: "+ Add Asset" }).click();
  76  |     await page.getByPlaceholder("Asset name").fill("Asset To Delete");
  77  |     await page.getByRole("button", { name: "Generate", exact: true }).click();
  78  |     await page.waitForTimeout(300);
  79  |     await page.getByRole("button", { name: "Add Asset" }).click();
  80  |     await page.waitForTimeout(500);
  81  | 
  82  |     await expect(page.getByText("Asset To Delete")).toBeVisible();
  83  | 
  84  |     // Delete it
  85  |     page.on("dialog", (dialog) => dialog.accept());
  86  |     const deleteButton = page
  87  |       .locator('button:has(svg path[d*="M19 7l-.867"])')
  88  |       .last();
  89  |     await deleteButton.click();
  90  |     await page.waitForTimeout(500);
  91  | 
  92  |     await expect(page.getByText("Asset To Delete")).not.toBeVisible();
  93  |   });
  94  | 
  95  |   test("shows barcode on asset card", async ({ page }) => {
  96  |     await expect(page.getByText("CH-PEWS-001")).toBeVisible();
  97  |     await expect(page.getByText("CH-SOUND-001")).toBeVisible();
  98  |   });
  99  | 
  100 |   test("opens barcode print window", async ({ page }) => {
  101 |     const barcodeButton = page.getByRole("button", { name: "Barcode" }).first();
  102 |     await expect(barcodeButton).toBeVisible();
  103 |   });
  104 | 
  105 |   test("shows category and location tags on asset cards", async ({ page }) => {
  106 |     const firstCard = page.locator('div:has(h3:text("Wooden Pews"))');
  107 |     await expect(firstCard.getByText("Furniture")).toBeVisible();
  108 |     await expect(firstCard.getByText("Sanctuary")).toBeVisible();
  109 |   });
  110 | });
```