import { prisma } from "@/lib/db";
import { AddPurchaseClient } from "./_components/AddPurchaseClient";

export default async function NewPurchasePage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  const contacts = await prisma.contact.findMany({ where: { userId: "demo-user" }, include: { balance: true }, orderBy: { name: "asc" } });
  return <AddPurchaseClient categories={categories} contacts={contacts} />;
}
