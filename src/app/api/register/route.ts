import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if this is the first user (public registration allowed)
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      // Require admin permission to create additional users
      const { error } = await requirePermission("users", "manage");
      if (error) return error;
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Validate role if provided (only admins can set roles)
    let userRole = "admin";
    if (userCount > 0) {
      // Default new users to editor role; admin specified via form
      userRole = role === "admin" ? "admin" : "editor";
    }

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: userRole,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
