import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth's auth function
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    })),
  },
}));

import { auth } from "@/lib/auth";
import { requireAuth, requirePermission } from "@/lib/auth-api";

const mockAuth = vi.mocked(auth);

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("returns error when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: null, expires: "" });

    const result = await requireAuth();

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("returns user when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "admin@church.org",
        name: "Admin",
        role: "admin",
      },
      expires: "",
    });

    const result = await requireAuth();

    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    expect(result.user.id).toBe("user-1");
    expect(result.user.email).toBe("admin@church.org");
    expect(result.user.role).toBe("admin");
  });

  it("defaults to viewer role when role is missing", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-2",
        email: "viewer@church.org",
        name: "Viewer",
        role: undefined as unknown as string,
      },
      expires: "",
    });

    const result = await requireAuth();

    expect(result.error).toBeNull();
    expect(result.user.role).toBe("viewer");
  });
});

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await requirePermission("assets", "create");

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(401);
  });

  it("returns error when user lacks permission", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "viewer-1",
        email: "viewer@church.org",
        name: "Viewer",
        role: "viewer",
      },
      expires: "",
    });

    const result = await requirePermission("assets", "delete");

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("allows user with sufficient permission", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@church.org",
        name: "Admin",
        role: "admin",
      },
      expires: "",
    });

    const result = await requirePermission("users", "manage");

    expect(result.error).toBeNull();
    expect(result.user.role).toBe("admin");
  });

  it("allows editor to create assets", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "editor-1",
        email: "editor@church.org",
        name: "Editor",
        role: "editor",
      },
      expires: "",
    });

    const result = await requirePermission("assets", "create");

    expect(result.error).toBeNull();
  });

  it("denies editor from deleting assets", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "editor-1",
        email: "editor@church.org",
        name: "Editor",
        role: "editor",
      },
      expires: "",
    });

    const result = await requirePermission("assets", "delete");

    expect(result.error).not.toBeNull();
    expect(result.error?.status).toBe(403);
  });
});
