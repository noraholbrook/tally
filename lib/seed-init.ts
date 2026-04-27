import { prisma, DEMO_USER_ID } from "./db";

let initialized = false;

export async function ensureSeeded() {
  if (initialized) return;
  initialized = true;

  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (user) return;

  await prisma.user.create({
    data: { id: DEMO_USER_ID, name: "Me", email: "me@tally.app", venmoHandle: "" },
  });

  // Seed categories only — no demo contacts or purchases
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
    });
  }
}
