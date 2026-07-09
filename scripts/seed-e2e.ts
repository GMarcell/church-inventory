import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding E2E test data...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const editorPassword = await bcrypt.hash("editor123", 12);
  const viewerPassword = await bcrypt.hash("viewer123", 12);

  // Upsert test users
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: { passwordHash: adminPassword, role: "admin" },
    create: {
      name: "Admin User",
      email: "admin@test.com",
      passwordHash: adminPassword,
      role: "admin",
    },
  });
  console.log(`Admin user: ${admin.email} (${admin.id})`);

  const editor = await prisma.user.upsert({
    where: { email: "editor@test.com" },
    update: { passwordHash: editorPassword, role: "editor" },
    create: {
      name: "Editor User",
      email: "editor@test.com",
      passwordHash: editorPassword,
      role: "editor",
    },
  });
  console.log(`Editor user: ${editor.email} (${editor.id})`);

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@test.com" },
    update: { passwordHash: viewerPassword, role: "viewer" },
    create: {
      name: "Viewer User",
      email: "viewer@test.com",
      passwordHash: viewerPassword,
      role: "viewer",
    },
  });
  console.log(`Viewer user: ${viewer.email} (${viewer.id})`);

  // Create sample categories
  const cat1 = await prisma.category.upsert({
    where: { name: "Furniture" },
    update: {},
    create: { name: "Furniture", description: "Chairs, tables, pews" },
  });

  const cat2 = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: { name: "Electronics", description: "Sound systems, projectors" },
  });

  // Create sample locations
  const loc1 = await prisma.location.upsert({
    where: { name: "Sanctuary" },
    update: {},
    create: { name: "Sanctuary", description: "Main worship hall" },
  });

  const loc2 = await prisma.location.upsert({
    where: { name: "Storage Room" },
    update: {},
    create: { name: "Storage Room", description: null },
  });

  // Create sample assets
  const existingAssets = await prisma.asset.findMany();
  if (existingAssets.length === 0) {
    await prisma.asset.create({
      data: {
        name: "Wooden Pews",
        description: "Oak pews for the sanctuary",
        quantity: 20,
        barcode: "CH-PEWS-001",
        categoryId: cat1.id,
        locationId: loc1.id,
      },
    });
    await prisma.asset.create({
      data: {
        name: "Sound System",
        description: "Main audio system",
        quantity: 1,
        barcode: "CH-SOUND-001",
        categoryId: cat2.id,
        locationId: loc1.id,
      },
    });
    await prisma.asset.create({
      data: {
        name: "Spare Microphones",
        description: "Extra wireless mics",
        quantity: 4,
        barcode: "CH-MICS-001",
        categoryId: cat2.id,
        locationId: loc2.id,
      },
    });
    console.log("Created 3 sample assets");
  }

  console.log("E2E test data seeded successfully!");
  console.log("\nTest accounts:");
  console.log("  Admin:  admin@test.com / admin123");
  console.log("  Editor: editor@test.com / editor123");
  console.log("  Viewer: viewer@test.com / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
