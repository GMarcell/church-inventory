import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    location: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe("Locations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/locations", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/locations/route");
      const response = await GET();

      expect(response.status).toBe(401);
    });

    it("returns locations list", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });

      const mockLocations = [
        { id: "loc-1", name: "Sanctuary", description: "Main hall", _count: { assets: 10 } },
        { id: "loc-2", name: "Storage Room", description: null, _count: { assets: 2 } },
      ];
      mockPrisma.location.findMany.mockResolvedValue(mockLocations);

      const { GET } = await import("@/app/api/locations/route");
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockLocations);
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
        include: { _count: { select: { assets: true } } },
      });
    });

    it("returns empty array when no locations", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });
      mockPrisma.location.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/locations/route");
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it("returns 500 on database error", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });
      mockPrisma.location.findMany.mockRejectedValue(new Error("DB error"));

      const { GET } = await import("@/app/api/locations/route");
      const response = await GET();

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/locations", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Location" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("returns 403 for viewer", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "v1", email: "v@t.com", name: "V", role: "viewer" },
        expires: "",
      });

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Location" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it("allows editor to create a location", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "e1", email: "e@t.com", name: "E", role: "editor" },
        expires: "",
      });

      mockPrisma.location.create.mockResolvedValue({
        id: "loc-new",
        name: "New Location",
        description: null,
      });

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Location" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("returns 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Location name is required");
    });

    it("creates a location with description", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });

      const created = { id: "loc-1", name: "Kitchen", description: "Church kitchen" };
      mockPrisma.location.create.mockResolvedValue(created);

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Kitchen", description: "Church kitchen" }),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.name).toBe("Kitchen");
      expect(body.description).toBe("Church kitchen");
    });

    it("returns 409 on duplicate location name", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });

      const prismaError = new Error("Unique constraint") as Error & { code: string };
      prismaError.code = "P2002";
      mockPrisma.location.create.mockRejectedValue(prismaError);

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Duplicate" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe("Location with this name already exists");
    });

    it("handles generic database error on create", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "a1", email: "a@t.com", name: "A", role: "admin" },
        expires: "",
      });
      mockPrisma.location.create.mockRejectedValue(new Error("Unknown error"));

      const { POST } = await import("@/app/api/locations/route");
      const request = new Request("http://localhost:3000/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
