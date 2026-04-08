import { prisma, DEMO_USER_ID } from "./db";

let initialized = false;

export async function ensureSeeded() {
  if (initialized) return;
  initialized = true;

  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (user) return; // Already seeded

  // Create demo user
  await prisma.user.create({
    data: { id: DEMO_USER_ID, name: "Alex Johnson", email: "alex@example.com", venmoHandle: "@alexj" },
  });

  // Categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Food & Drink", icon: "🍔", color: "#F97316" } }),
    prisma.category.create({ data: { name: "Transport", icon: "🚗", color: "#3B82F6" } }),
    prisma.category.create({ data: { name: "Entertainment", icon: "🎬", color: "#8B5CF6" } }),
    prisma.category.create({ data: { name: "Groceries", icon: "🛒", color: "#10B981" } }),
    prisma.category.create({ data: { name: "Utilities", icon: "⚡", color: "#F59E0B" } }),
    prisma.category.create({ data: { name: "Travel", icon: "✈️", color: "#06B6D4" } }),
  ]);

  // Contacts
  const contacts = await Promise.all([
    prisma.contact.create({ data: { userId: DEMO_USER_ID, name: "Jordan Lee", email: "jordan@example.com", venmoHandle: "@jordanlee", phone: "555-0101" } }),
    prisma.contact.create({ data: { userId: DEMO_USER_ID, name: "Sam Rivera", email: "sam@example.com", venmoHandle: "@samr", phone: "555-0102" } }),
    prisma.contact.create({ data: { userId: DEMO_USER_ID, name: "Taylor Kim", email: "taylor@example.com", venmoHandle: "@taylork" } }),
    prisma.contact.create({ data: { userId: DEMO_USER_ID, name: "Morgan Chen", email: "morgan@example.com" } }),
  ]);

  // Sample purchases
  const p1 = await prisma.purchase.create({
    data: {
      userId: DEMO_USER_ID,
      merchant: "Nobu Restaurant",
      amount: 12000,
      tax: 1080,
      tip: 2400,
      categoryId: categories[0].id,
      notes: "Birthday dinner",
      date: new Date("2024-01-15"),
      source: "MANUAL",
      isSplit: true,
    },
  });
  await prisma.splitParticipant.create({ data: { purchaseId: p1.id, contactId: contacts[0].id, shareType: "EQUAL", shareValue: 5160 } });
  await prisma.splitParticipant.create({ data: { purchaseId: p1.id, contactId: contacts[1].id, shareType: "EQUAL", shareValue: 5160 } });

  const p2 = await prisma.purchase.create({
    data: {
      userId: DEMO_USER_ID,
      merchant: "Uber",
      amount: 2840,
      tax: 0,
      tip: 300,
      categoryId: categories[1].id,
      date: new Date("2024-01-18"),
      source: "SIMULATED",
      isSplit: true,
    },
  });
  await prisma.splitParticipant.create({ data: { purchaseId: p2.id, contactId: contacts[2].id, shareType: "EQUAL", shareValue: 1570 } });

  await prisma.purchase.create({
    data: {
      userId: DEMO_USER_ID,
      merchant: "Whole Foods",
      amount: 8743,
      tax: 612,
      categoryId: categories[3].id,
      date: new Date("2024-01-20"),
      source: "MANUAL",
      isSplit: false,
    },
  });

  // Balances
  await prisma.balance.create({ data: { contactId: contacts[0].id, totalOwed: 7590, totalPaid: 2000, outstanding: 5590 } });
  await prisma.balance.create({ data: { contactId: contacts[1].id, totalOwed: 5160, totalPaid: 5160, outstanding: 0 } });
  await prisma.balance.create({ data: { contactId: contacts[2].id, totalOwed: 1570, totalPaid: 0, outstanding: 1570 } });
  await prisma.balance.create({ data: { contactId: contacts[3].id, totalOwed: 2430, totalPaid: 0, outstanding: 2430 } });

  // Request draft
  await prisma.requestDraft.create({
    data: {
      userId: DEMO_USER_ID,
      contactId: contacts[0].id,
      purchaseId: p1.id,
      amount: 5590,
      message: "Hey Jordan! You owe $55.90 for Nobu dinner. Thanks! 🙏",
      status: "DRAFT",
    },
  });
}
