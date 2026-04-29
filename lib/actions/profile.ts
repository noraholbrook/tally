"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";

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
