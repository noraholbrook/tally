"use server";

import { revalidatePath } from "next/cache";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { contactSchema } from "@/lib/validations/contact";

export async function getContacts() {
  return prisma.contact.findMany({
    where: { userId: DEMO_USER_ID },
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
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    venmoHandle: formData.get("venmoHandle") as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten() };

  const contact = await prisma.contact.create({
    data: { userId: DEMO_USER_ID, ...parsed.data },
  });

  revalidatePath("/contacts");
  return { contactId: contact.id };
}

export async function updateContact(id: string, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    venmoHandle: formData.get("venmoHandle") as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten() };

  await prisma.contact.update({ where: { id }, data: parsed.data });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  return { success: true };
}
