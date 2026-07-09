import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe("Assets API authorization checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    // Import the handlers dynamically to get fresh mock state
    const { GET } = await import("@/app/api/assets/route");

    const request = new Request("http://localhost:3000/api/assets");
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns 401 for asset detail GET if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET: GetById } = await import("@/app/api/assets/[id]/route");

    const request = new Request("http://localhost:3000/api/assets/123");
    const response = await GetById(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 for asset DELETE if viewer", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "viewer-1",
        email: "viewer@test.com",
        name: "Viewer",
        role: "viewer",
      },
      expires: "",
    });

    const { DELETE } = await import("@/app/api/assets/[id]/route");

    const request = new Request("http://localhost:3000/api/assets/123");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 403 for asset POST if viewer", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "viewer-1",
        email: "viewer@test.com",
        name: "Viewer",
        role: "viewer",
      },
      expires: "",
    });

    const { POST } = await import("@/app/api/assets/route");

    const request = new Request("http://localhost:3000/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Asset",
        quantity: 1,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("returns 403 for asset PUT if viewer", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "viewer-1",
        email: "viewer@test.com",
        name: "Viewer",
        role: "viewer",
      },
      expires: "",
    });

    const { PUT } = await import("@/app/api/assets/[id]/route");

    const request = new Request("http://localhost:3000/api/assets/123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Asset" }),
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(403);
  });

  it("allows admin to GET assets", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin",
        role: "admin",
      },
      expires: "",
    });

    mockPrisma.asset.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/assets/route");

    const request = new Request("http://localhost:3000/api/assets");
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("allows editor to POST assets", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "editor-1",
        email: "editor@test.com",
        name: "Editor",
        role: "editor",
      },
      expires: "",
    });

    mockPrisma.asset.create.mockResolvedValue({
      id: "asset-1",
      name: "New Asset",
      description: null,
      quantity: 5,
      barcode: "CH-TEST-123",
      categoryId: null,
      locationId: null,
      category: null,
      location: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const { POST } = await import("@/app/api/assets/route");

    const request = new Request("http://localhost:3000/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Asset",
        quantity: 5,
        barcode: "CH-TEST-123",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("New Asset");
  });

  it("allows admin to DELETE assets", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin",
        role: "admin",
      },
      expires: "",
    });

    mockPrisma.asset.findUnique.mockResolvedValue({
      id: "asset-1",
      name: "To Delete",
    } as never);

    mockPrisma.asset.delete.mockResolvedValue({} as never);

    const { DELETE } = await import("@/app/api/assets/[id]/route");

    const request = new Request("http://localhost:3000/api/assets/asset-1");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "asset-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Asset deleted successfully");
  });
});
