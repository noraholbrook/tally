import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { name, venmoHandle, password } = await req.json();

    if (!name || !venmoHandle || !password) {
      return NextResponse.json({ error: "Name, Venmo handle and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const handle = venmoHandle.trim().startsWith("@")
      ? venmoHandle.trim()
      : `@${venmoHandle.trim()}`;

    const existing = await prisma.user.findUnique({ where: { venmoHandle: handle } });
    if (existing) {
      return NextResponse.json({ error: "An account with this Venmo handle already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, venmoHandle: handle, password: hashed },
    });

    // Back-link any contacts other users created with this Venmo handle
    await prisma.contact.updateMany({
      where: { venmoHandle: handle, linkedUserId: null },
      data: { linkedUserId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
