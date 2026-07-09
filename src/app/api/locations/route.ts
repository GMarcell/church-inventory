import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-api";

export async function GET() {
  const { error } = await requirePermission("locations", "read");
  if (error) return error;

  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true } } },
    });
    return NextResponse.json(locations);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("locations", "create");
  if (error) return error;

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: { name: name.trim(), description },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Location with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
