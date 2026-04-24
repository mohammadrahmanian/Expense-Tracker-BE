import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillCategoryDepths() {
  const categories = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const parentMap = new Map(categories.map((c) => [c.id, c.parentId]));

  const computeDepth = (id: string): number => {
    const parentId = parentMap.get(id);
    if (!parentId) return 0;
    return computeDepth(parentId) + 1;
  };

  const updates = categories.map((c) => ({
    id: c.id,
    depth: computeDepth(c.id),
  }));

  const needsUpdate = updates.filter((u) => u.depth > 0);

  console.log(`Total categories: ${categories.length}`);
  console.log(`Categories needing depth update: ${needsUpdate.length}`);

  if (needsUpdate.length === 0) {
    console.log("No updates needed.");
    return;
  }

  await prisma.$transaction(
    needsUpdate.map((u) =>
      prisma.category.update({
        where: { id: u.id },
        data: { depth: u.depth },
      }),
    ),
  );

  console.log("Depth backfill complete.");
}

backfillCategoryDepths()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
