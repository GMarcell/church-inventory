import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

const adminUser = { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" };
const editorUser = { id: "editor-1", email: "editor@test.com", name: "Editor", role: "editor" };
const viewerUser = { id: "viewer-1", email: "viewer@test.com", name: "Viewer", role: "viewer" };

describe("Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import("@/app/api/users/route");
      const response = await GET();

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin (editor)", async () => {
      mockAuth.mockResolvedValue({
        user: editorUser,
        expires: "",
      });

      const { GET } = await import("@/app/api/users/route");
      const response = await GET();

      expect(response.status).toBe(403);
    });

    it("returns 403 for viewer", async () => {
      mockAuth.mockResolvedValue({
        user: viewerUser,
        expires: "",
      });

      const { GET } = await import("@/app/api/users/route");
      const response = await GET();

      expect(response.status).toBe(403);
    });

    it("returns users list for admin", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const mockUsers = [
        { id: "u1", name: "Alice", email: "alice@test.com", role: "admin", createdAt: new Date().toISOString() },
        { id: "u2", name: "Bob", email: "bob@test.com", role: "editor", createdAt: new Date().toISOString() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const { GET } = await import("@/app/api/users/route");
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
    });
  });

  describe("PUT /api/users", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "u1", role: "editor" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue({
        user: editorUser,
        expires: "",
      });

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "u1", role: "editor" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(403);
    });

    it("returns 400 when user ID is missing", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "editor" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("User ID is required");
    });

    it("returns 404 when target user not found", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "nonexistent", role: "editor" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(404);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "nonexistent" } });
    });

    it("prevents admin from changing their own role", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "admin-1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
      });

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "admin-1", role: "editor" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("You cannot change your own role");
    });

    it("returns 400 for invalid role", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        name: "User",
        email: "user@test.com",
        role: "editor",
      });

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "u1", role: "superadmin" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Invalid role");
    });

    it("allows admin to change another user's role", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const targetUser = { id: "editor-1", name: "Editor", email: "editor@test.com", role: "editor", passwordHash: "hash" };
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);

      const updatedUser = { id: "editor-1", name: "Editor", email: "editor@test.com", role: "viewer", createdAt: new Date().toISOString() };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "editor-1", role: "viewer" }),
      });
      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.role).toBe("viewer");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "editor-1" },
        data: { role: "viewer" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    });

    it("allows changing a user's name", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const targetUser = { id: "u1", name: "Old", email: "u@test.com", role: "editor", passwordHash: "hash" };
      mockPrisma.user.findUnique.mockResolvedValue(targetUser);

      const updatedUser = { id: "u1", name: "New Name", email: "u@test.com", role: "editor", createdAt: new Date().toISOString() };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const { PUT } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "u1", name: "New Name" }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { name: "New Name" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
    });
  });

  describe("DELETE /api/users", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users?id=u1", { method: "DELETE" });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue({
        user: editorUser,
        expires: "",
      });

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users?id=u1", { method: "DELETE" });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
    });

    it("returns 400 when user ID is missing", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users", { method: "DELETE" });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("User ID is required");
    });

    it("prevents admin from deleting themselves", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request(`http://localhost:3000/api/users?id=${adminUser.id}`, { method: "DELETE" });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("You cannot delete your own account");
    });

    it("returns 404 when target user not found", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users?id=nonexistent", { method: "DELETE" });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });

    it("allows admin to delete another user", async () => {
      mockAuth.mockResolvedValue({
        user: adminUser,
        expires: "",
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "editor-1",
        name: "Editor",
        email: "editor@test.com",
        role: "editor",
      });
      mockPrisma.user.delete.mockResolvedValue({} as never);

      const { DELETE } = await import("@/app/api/users/route");
      const request = new Request("http://localhost:3000/api/users?id=editor-1", { method: "DELETE" });
      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.message).toBe("User deleted successfully");
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: "editor-1" } });
    });
  });
});
