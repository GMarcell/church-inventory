import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe("Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/categories/route");
      const response = await GET();

      expect(response.status).toBe(401);
    });

    it("returns 403 for viewer (viewers can read, so this should succeed)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "v1", email: "v@t.com", name: "V", role: "viewer" },
        expires: "",
      });
      mockPrisma.category.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/categories/route");
      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("returns categories list", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });

      const mockCategories = [
        { id: "cat-1", name: "Furniture", description: null, _count: { assets: 3 } },
        { id: "cat-2", name: "Electronics", description: "Devices", _count: { assets: 5 } },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const { GET } = await import("@/app/api/categories/route");
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockCategories);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
        include: { _count: { select: { assets: true } } },
      });
    });

    it("returns 500 on database error", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });
      mockPrisma.category.findMany.mockRejectedValue(new Error("DB down"));

      const { GET } = await import("@/app/api/categories/route");
      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/categories", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Cat" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 403 for viewer", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "v1", email: "v@t.com", name: "V", role: "viewer" },
        expires: "",
      });

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Cat" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("returns 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Category name is required");
    });

    it("returns 400 when name is empty string", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("allows editor to create a category", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      const created = { id: "cat-new", name: "New Category", description: null };
      mockPrisma.category.create.mockResolvedValue(created);

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Category" }),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe("New Category");
      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: "New Category", description: undefined },
      });
    });

    it("returns 409 on duplicate category name", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      const prismaError = new Error("Unique constraint") as Error & { code: string };
      prismaError.code = "P2002";
      mockPrisma.category.create.mockRejectedValue(prismaError);

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Duplicate" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("Category with this name already exists");
    });

    it("trims whitespace from category name", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      mockPrisma.category.create.mockResolvedValue({ id: "cat-1", name: "Trimmed", description: null });

      const { POST } = await import("@/app/api/categories/route");
      const request = new Request("http://localhost:3000/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  Trimmed  " }),
      });
      await POST(request);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: "Trimmed", description: undefined },
      });
    });
  });
});
