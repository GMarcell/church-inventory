import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission, can, getAllPermissions } from "@/lib/rbac";

describe("hasPermission", () => {
  it("returns false for undefined role", () => {
    expect(hasPermission(undefined, "assets:read")).toBe(false);
  });

  it("returns false for null role", () => {
    expect(hasPermission(null, "assets:read")).toBe(false);
  });

  it("allows admin to manage users", () => {
    expect(hasPermission("admin", "users:manage")).toBe(true);
  });

  it("allows admin to delete assets", () => {
    expect(hasPermission("admin", "assets:delete")).toBe(true);
  });

  it("allows admin to read categories", () => {
    expect(hasPermission("admin", "categories:read")).toBe(true);
  });

  it("allows editor to create assets", () => {
    expect(hasPermission("editor", "assets:create")).toBe(true);
  });

  it("allows editor to read locations", () => {
    expect(hasPermission("editor", "locations:read")).toBe(true);
  });

  it("denies editor from deleting assets", () => {
    expect(hasPermission("editor", "assets:delete")).toBe(false);
  });

  it("denies editor from managing users", () => {
    expect(hasPermission("editor", "users:manage")).toBe(false);
  });

  it("allows viewer to read assets", () => {
    expect(hasPermission("viewer", "assets:read")).toBe(true);
  });

  it("denies viewer from creating assets", () => {
    expect(hasPermission("viewer", "assets:create")).toBe(false);
  });

  it("denies viewer from managing users", () => {
    expect(hasPermission("viewer", "users:manage")).toBe(false);
  });

  it("denies viewer from deleting categories", () => {
    expect(hasPermission("viewer", "categories:delete")).toBe(false);
  });

  it("denies unknown role from all permissions", () => {
    expect(hasPermission("superadmin" as never, "assets:read")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true if any permission matches", () => {
    expect(
      hasAnyPermission("editor", "assets:delete", "assets:update", "users:manage")
    ).toBe(true);
  });

  it("returns false if no permissions match", () => {
    expect(
      hasAnyPermission("viewer", "assets:create", "assets:delete", "users:manage")
    ).toBe(false);
  });

  it("returns false for undefined role", () => {
    expect(hasAnyPermission(undefined, "assets:read")).toBe(false);
  });
});

describe("can", () => {
  it("checks admin can manage users resource", () => {
    expect(can("admin", "users", "manage")).toBe(true);
  });

  it("checks editor can create locations", () => {
    expect(can("editor", "locations", "create")).toBe(true);
  });

  it("checks editor cannot delete locations", () => {
    expect(can("editor", "locations", "delete")).toBe(false);
  });

  it("checks viewer can only read", () => {
    expect(can("viewer", "assets", "read")).toBe(true);
    expect(can("viewer", "assets", "create")).toBe(false);
    expect(can("viewer", "assets", "update")).toBe(false);
    expect(can("viewer", "assets", "delete")).toBe(false);
    expect(can("viewer", "categories", "read")).toBe(true);
    expect(can("viewer", "locations", "read")).toBe(true);
  });
});

describe("getAllPermissions", () => {
  it("returns all possible permission strings", () => {
    const permissions = getAllPermissions();
    expect(permissions).toContain("assets:create");
    expect(permissions).toContain("assets:read");
    expect(permissions).toContain("assets:update");
    expect(permissions).toContain("assets:delete");
    expect(permissions).toContain("categories:create");
    expect(permissions).toContain("categories:read");
    expect(permissions).toContain("categories:update");
    expect(permissions).toContain("categories:delete");
    expect(permissions).toContain("locations:create");
    expect(permissions).toContain("locations:read");
    expect(permissions).toContain("locations:update");
    expect(permissions).toContain("locations:delete");
    expect(permissions).toContain("users:manage");
    expect(permissions.length).toBe(13);
  });
});
