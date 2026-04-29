import { prisma } from "./db";

let initialized = false;

export async function ensureSeeded() {
  if (initialized) return;
  initialized = true;

  // Seed categories if missing
  const existing = await prisma.category.count();
  if (existing === 0) {
    await prisma.category.createMany({
      data: [
        { name: "Food & Drink",   icon: "🍔", color: "#F97316" },
        { name: "Transport",      icon: "🚗", color: "#3B82F6" },
        { name: "Entertainment",  icon: "🎬", color: "#8B5CF6" },
        { name: "Groceries",      icon: "🛒", color: "#10B981" },
        { name: "Utilities",      icon: "⚡", color: "#F59E0B" },
        { name: "Travel",         icon: "✈️", color: "#06B6D4" },
        { name: "Shopping",       icon: "🛍️", color: "#EC4899" },
        { name: "Health",         icon: "💊", color: "#14B8A6" },
      ],
      skipDuplicates: true,
    });
  }

  // Backfill linkedUserId: link contacts whose email matches a registered user.
  // Runs on every startup but is a no-op once all contacts are linked.
  const unlinked = await prisma.contact.findMany({
    where: { email: { not: null }, linkedUserId: null },
    select: { id: true, email: true },
  });

  for (const contact of unlinked) {
    const matched = await prisma.user.findUnique({
      where: { email: contact.email! },
      select: { id: true },
    });
    if (matched) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { linkedUserId: matched.id },
      });
    }
  }
}
