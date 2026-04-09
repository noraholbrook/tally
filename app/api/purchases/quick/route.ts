import { NextRequest, NextResponse } from "next/server";
import { prisma, DEMO_USER_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchant, amount } = body;

    if (!merchant || amount === undefined) {
      return NextResponse.json({ success: false, error: "merchant and amount are required" }, { status: 400 });
    }

    // amount comes in as dollars (e.g. 6.50), convert to cents
    const amountCents = Math.round(parseFloat(String(amount)) * 100);

    if (isNaN(amountCents) || amountCents <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: DEMO_USER_ID,
        merchant: String(merchant).trim(),
        amount: amountCents,
        tax: 0,
        tip: 0,
        date: new Date(),
        source: "APPLE_PAY",
        isSplit: false,
      },
    });

    return NextResponse.json({ success: true, purchaseId: purchase.id, merchant, amount: amountCents });
  } catch (error) {
    console.error("Quick purchase error:", error);
    return NextResponse.json({ success: false, error: "Failed to create purchase" }, { status: 500 });
  }
}

// Allow GET for easy testing in browser
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchant = searchParams.get("merchant");
  const amount = searchParams.get("amount");

  if (!merchant || !amount) {
    return NextResponse.json({ success: false, error: "merchant and amount query params required" }, { status: 400 });
  }

  const amountCents = Math.round(parseFloat(amount) * 100);

  if (isNaN(amountCents) || amountCents <= 0) {
    return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
  }

  try {
    const purchase = await prisma.purchase.create({
      data: {
        userId: DEMO_USER_ID,
        merchant: merchant.trim(),
        amount: amountCents,
        tax: 0,
        tip: 0,
        date: new Date(),
        source: "APPLE_PAY",
        isSplit: false,
      },
    });

    return NextResponse.json({ success: true, purchaseId: purchase.id, merchant, amount: amountCents });
  } catch (error) {
    console.error("Quick purchase error:", error);
    return NextResponse.json({ success: false, error: "Failed to create purchase" }, { status: 500 });
  }
}
