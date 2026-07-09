import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-api";

export async function GET() {
  const { error } = await requirePermission("users", "manage");
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { user: currentUser, error } = await requirePermission("users", "manage");
  if (error) return error;

  try {
    const body = await request.json();
    const { id, role, name } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admins from changing their own role
    if (id === currentUser.id && role && role !== targetUser.role) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "editor", "viewer"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(name !== undefined && { name: name || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { user: currentUser, error } = await requirePermission("users", "manage");
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
