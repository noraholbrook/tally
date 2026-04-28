import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function logPurchase(userId: string, merchant: string, amount: string | number) {
  const amountCents = Math.round(parseFloat(String(amount)) * 100);
  if (isNaN(amountCents) || amountCents <= 0) {
    throw new Error("Invalid amount");
  }

  return prisma.purchase.create({
    data: {
      userId,
      merchant: String(merchant).trim(),
      amount: amountCents,
      tax: 0,
      tip: 0,
      date: new Date(),
      source: "APPLE_PAY",
      isSplit: false,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { merchant, amount, userId: bodyUserId } = body;

    const userId = session?.user?.id ?? bodyUserId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!merchant || amount === undefined) return NextResponse.json({ error: "merchant and amount required" }, { status: 400 });

    const purchase = await logPurchase(userId, merchant, amount);
    return NextResponse.json({ success: true, purchaseId: purchase.id });
  } catch (e) {
    console.error("Quick purchase error:", e);
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const merchant = searchParams.get("merchant");
    const amount = searchParams.get("amount");
    const queryUserId = searchParams.get("userId");

    const userId = session?.user?.id ?? queryUserId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!merchant || !amount) return NextResponse.json({ error: "merchant and amount required" }, { status: 400 });

    const purchase = await logPurchase(userId, merchant, amount);
    return NextResponse.json({ success: true, purchaseId: purchase.id });
  } catch (e) {
    console.error("Quick purchase error:", e);
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}
