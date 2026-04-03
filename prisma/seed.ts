import { PrismaClient } from "@prisma/client";
import { PurchaseSource, ShareType, DraftStatus } from "../lib/constants";

const prisma = new PrismaClient();

async function main() {
  // Clean slate
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.splitAllocation.deleteMany();
  await prisma.splitParticipant.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.receiptUpload.deleteMany();
  await prisma.requestDraft.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Demo user
  const user = await prisma.user.create({
    data: { id: "demo-user", name: "Alex Johnson", email: "alex@example.com", venmoHandle: "@alexj" },
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
    prisma.contact.create({ data: { userId: user.id, name: "Jordan Lee", email: "jordan@example.com", venmoHandle: "@jordanlee", phone: "555-0101" } }),
    prisma.contact.create({ data: { userId: user.id, name: "Sam Rivera", email: "sam@example.com", venmoHandle: "@samr", phone: "555-0102" } }),
    prisma.contact.create({ data: { userId: user.id, name: "Taylor Kim", email: "taylor@example.com", venmoHandle: "@taylork" } }),
    prisma.contact.create({ data: { userId: user.id, name: "Morgan Chen", email: "morgan@example.com" } }),
  ]);

  // Purchase 1: Dinner - split equally with Jordan and Sam
  const p1 = await prisma.purchase.create({
    data: {
      userId: user.id,
      merchant: "Nobu Restaurant",
      amount: 12000,
      tax: 1080,
      tip: 2400,
      categoryId: categories[0].id,
      notes: "Birthday dinner",
      date: new Date("2024-01-15"),
      source: PurchaseSource.MANUAL,
      isSplit: true,
    },
  });

  const sp1a = await prisma.splitParticipant.create({ data: { purchaseId: p1.id, contactId: contacts[0].id, shareType: ShareType.EQUAL, shareValue: 5160 } });
  const sp1b = await prisma.splitParticipant.create({ data: { purchaseId: p1.id, contactId: contacts[1].id, shareType: ShareType.EQUAL, shareValue: 5160 } });

  // Purchase 2: Uber - split with Taylor
  const p2 = await prisma.purchase.create({
    data: {
      userId: user.id,
      merchant: "Uber",
      amount: 2840,
      tax: 0,
      tip: 300,
      categoryId: categories[1].id,
      date: new Date("2024-01-18"),
      source: PurchaseSource.SIMULATED,
      isSplit: true,
    },
  });
  await prisma.splitParticipant.create({ data: { purchaseId: p2.id, contactId: contacts[2].id, shareType: ShareType.EQUAL, shareValue: 1570 } });

  // Purchase 3: Grocery run - not split
  await prisma.purchase.create({
    data: {
      userId: user.id,
      merchant: "Whole Foods",
      amount: 8743,
      tax: 612,
      categoryId: categories[3].id,
      date: new Date("2024-01-20"),
      source: PurchaseSource.MANUAL,
      isSplit: false,
    },
  });

  // Purchase 4: Movie tickets - split with Jordan and Morgan
  const p4 = await prisma.purchase.create({
    data: {
      userId: user.id,
      merchant: "AMC Theaters",
      amount: 4500,
      tax: 360,
      categoryId: categories[2].id,
      notes: "Dune Part 2",
      date: new Date("2024-01-22"),
      source: PurchaseSource.RECEIPT,
      isSplit: true,
    },
  });
  await prisma.splitParticipant.create({ data: { purchaseId: p4.id, contactId: contacts[0].id, shareType: ShareType.EQUAL, shareValue: 2430 } });
  await prisma.splitParticipant.create({ data: { purchaseId: p4.id, contactId: contacts[3].id, shareType: ShareType.EQUAL, shareValue: 2430 } });

  // Balances
  await prisma.balance.create({ data: { contactId: contacts[0].id, totalOwed: 7590, totalPaid: 2000, outstanding: 5590 } });
  await prisma.balance.create({ data: { contactId: contacts[1].id, totalOwed: 5160, totalPaid: 5160, outstanding: 0 } });
  await prisma.balance.create({ data: { contactId: contacts[2].id, totalOwed: 1570, totalPaid: 0, outstanding: 1570 } });
  await prisma.balance.create({ data: { contactId: contacts[3].id, totalOwed: 2430, totalPaid: 0, outstanding: 2430 } });

  // Request drafts
  await prisma.requestDraft.create({
    data: {
      userId: user.id,
      contactId: contacts[0].id,
      purchaseId: p1.id,
      amount: 5590,
      message: "Hey Jordan! You owe $55.90 for Nobu dinner + AMC tickets. Thanks! 🙏",
      status: DraftStatus.DRAFT,
    },
  });
  await prisma.requestDraft.create({
    data: {
      userId: user.id,
      contactId: contacts[1].id,
      purchaseId: p1.id,
      amount: 5160,
      message: "Sam, $51.60 for Nobu dinner. Thanks!",
      status: DraftStatus.SETTLED,
      sentAt: new Date("2024-01-16"),
      settledAt: new Date("2024-01-17"),
    },
  });

  // Settlement history
  const bal1 = await prisma.balance.findUnique({ where: { contactId: contacts[0].id } });
  if (bal1) {
    await prisma.settlement.create({ data: { balanceId: bal1.id, contactId: contacts[0].id, amount: 2000, notes: "Partial payment via Venmo", settledAt: new Date("2024-01-19") } });
  }

  console.log("✅ Seed complete");
  console.log(`   User: ${user.name} (${user.email})`);
  console.log(`   Contacts: ${contacts.length}`);
  console.log(`   Categories: ${categories.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
