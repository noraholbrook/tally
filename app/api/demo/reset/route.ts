import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST() {
  try {
    execSync("npx tsx prisma/seed.ts", { cwd: process.cwd(), stdio: "pipe" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
