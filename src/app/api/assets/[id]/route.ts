import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("assets", "read");
  if (error) return error;

  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { category: true, location: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch asset" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("assets", "update");
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, quantity, categoryId, locationId, barcode } =
      body;

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
        quantity:
          quantity !== undefined
            ? typeof quantity === "number"
              ? quantity
              : undefined
            : undefined,
        barcode: barcode !== undefined ? barcode : undefined,
        categoryId: categoryId !== undefined ? categoryId || null : undefined,
        locationId: locationId !== undefined ? locationId || null : undefined,
      },
      include: { category: true, location: true },
    });

    return NextResponse.json(asset);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: "An asset with this barcode already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("assets", "delete");
  if (error) return error;

  try {
    const { id } = await params;
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.asset.delete({ where: { id } });
    return NextResponse.json({ message: "Asset deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
