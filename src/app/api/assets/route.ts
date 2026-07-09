import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-api";

export async function GET(request: NextRequest) {
  const { error } = await requirePermission("assets", "read");
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const locationId = searchParams.get("locationId");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        location: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(assets);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission("assets", "create");
  if (error) return error;

  try {
    const body = await request.json();
    const { name, description, quantity, categoryId, locationId, barcode } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Asset name is required" },
        { status: 400 }
      );
    }

    const asset = await prisma.asset.create({
      data: {
        name: name.trim(),
        description: description || null,
        quantity: typeof quantity === "number" ? quantity : 1,
        barcode: barcode || generateBarcode(),
        categoryId: categoryId || null,
        locationId: locationId || null,
      },
      include: {
        category: true,
        location: true,
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "An asset with this barcode already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}

function generateBarcode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CH-${timestamp}-${random}`;
}
