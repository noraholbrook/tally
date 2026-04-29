"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

export async function updateProfile(data: {
  name: string;
  venmoHandle: string;
}) {
  const userId = await getCurrentUserId();

  if (!data.name.trim()) return { error: "Name is required" };

  const handle = data.venmoHandle
    ? data.venmoHandle.startsWith("@")
      ? data.venmoHandle.trim()
      : `@${data.venmoHandle.trim()}`
    : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name.trim(),
      venmoHandle: handle,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const userId = await getCurrentUserId();

  if (!data.newPassword || data.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) return { error: "No password set on this account" };

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect" };

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { success: true };
}
