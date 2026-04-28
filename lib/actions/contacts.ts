"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { contactSchema } from "@/lib/validations/contact";

export async function getContacts() {
  const userId = await getCurrentUserId();
  return prisma.contact.findMany({
    where: { userId },
    include: { balance: true },
    orderBy: { name: "asc" },
  });
}

export async function getContactById(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      balance: { include: { settlements: { orderBy: { settledAt: "desc" }, take: 10 } } },
      splitParticipants: {
        include: { purchase: { include: { category: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      requestDrafts: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function createContact(formData: FormData) {
  const userId = await getCurrentUserId();

  const raw = {
    name: (formData.get("name") ?? "") as string,
    email: (formData.get("email") ?? "") as string,
    phone: (formData.get("phone") ?? "") as string,
    venmoHandle: (formData.get("venmoHandle") ?? "") as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const data = {
    ...parsed.data,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    venmoHandle: parsed.data.venmoHandle || null,
  };

  const contact = await prisma.contact.create({
    data: { userId, ...data },
  });

  revalidatePath("/contacts");
  return { contactId: contact.id };
}

export async function updateContact(id: string, formData: FormData) {
  const raw = {
    name: (formData.get("name") ?? "") as string,
    email: (formData.get("email") ?? "") as string,
    phone: (formData.get("phone") ?? "") as string,
    venmoHandle: (formData.get("venmoHandle") ?? "") as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const data = {
    ...parsed.data,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    venmoHandle: parsed.data.venmoHandle || null,
  };

  await prisma.contact.update({ where: { id }, data });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  return { success: true };
}
