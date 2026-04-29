import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, venmoHandle } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }
    if (!venmoHandle) {
      return NextResponse.json({ error: "Venmo handle is required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const handle = venmoHandle.startsWith("@") ? venmoHandle : `@${venmoHandle}`;

    const user = await prisma.user.create({
      data: { name, email, password: hashed, venmoHandle: handle },
    });

    // Back-link any contacts other users created with this email
    // so their "you owe" balances appear immediately
    await prisma.contact.updateMany({
      where: { email, linkedUserId: null },
      data: { linkedUserId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
