"use server";

import { revalidatePath } from "next/cache";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { purchaseSchema } from "@/lib/validations/purchase";
import { PurchaseSource } from "@/lib/constants";

export async function createPurchase(formData: FormData) {
  const raw = {
    merchant: formData.get("merchant") as string,
    amount: formData.get("amount") as string,
    tax: formData.get("tax") as string,
    tip: formData.get("tip") as string,
    categoryId: formData.get("categoryId") as string,
    notes: formData.get("notes") as string,
    date: formData.get("date") as string,
    source: (formData.get("source") as string) ?? PurchaseSource.MANUAL,
  };

  const parsed = purchaseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const { items, ...purchaseData } = parsed.data;
  const purchase = await prisma.purchase.create({
    data: {
      userId: DEMO_USER_ID,
      ...purchaseData,
      ...(items && items.length > 0 ? { items: { create: items } } : {}),
    },
  });

  revalidatePath("/");
  return { purchaseId: purchase.id };
}

export async function getDashboardData() {
  const [purchases, contacts, categories] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId: DEMO_USER_ID },
      include: { category: true, splitParticipants: { include: { contact: true } } },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.contact.findMany({
      where: { userId: DEMO_USER_ID },
      include: { balance: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalOutstanding = contacts.reduce((sum, c) => sum + (c.balance?.outstanding ?? 0), 0);

  return { purchases, contacts, categories, totalOutstanding };
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findUnique({
    where: { id },
    include: {
      category: true,
      items: true,
      splitParticipants: { include: { contact: true, allocations: { include: { purchaseItem: true } } } },
      receiptUpload: true,
    },
  });
}

// Simulated Apple Pay merchants
const SIM_MERCHANTS = [
  { name: "Starbucks", category: "Food & Drink", min: 500, max: 1500 },
  { name: "Chipotle", category: "Food & Drink", min: 1000, max: 2500 },
  { name: "Uber Eats", category: "Food & Drink", min: 2000, max: 5000 },
  { name: "Lyft", category: "Transport", min: 800, max: 3000 },
  { name: "Uber", category: "Transport", min: 800, max: 3500 },
  { name: "Amazon", category: "Shopping", min: 1500, max: 15000 },
  { name: "Netflix", category: "Entertainment", min: 1599, max: 1999 },
  { name: "Spotify", category: "Entertainment", min: 999, max: 1599 },
  { name: "Trader Joe's", category: "Groceries", min: 3000, max: 9000 },
  { name: "Whole Foods", category: "Groceries", min: 4000, max: 12000 },
  { name: "Target", category: "Shopping", min: 2000, max: 8000 },
  { name: "AMC Theaters", category: "Entertainment", min: 1500, max: 5000 },
];

export async function generateSimulatedPurchase() {
  const merchant = SIM_MERCHANTS[Math.floor(Math.random() * SIM_MERCHANTS.length)];
  const amount = Math.floor(Math.random() * (merchant.max - merchant.min) + merchant.min);
  const taxRate = 0.08875;
  const tax = Math.round(amount * taxRate);

  const category = await prisma.category.findFirst({ where: { name: merchant.category } });

  const purchase = await prisma.purchase.create({
    data: {
      userId: DEMO_USER_ID,
      merchant: merchant.name,
      amount,
      tax,
      tip: 0,
      categoryId: category?.id,
      source: PurchaseSource.SIMULATED,
      date: new Date(),
    },
  });

  revalidatePath("/");
  return { purchaseId: purchase.id, merchant: merchant.name, amount, tax };
}
