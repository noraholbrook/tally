import { notFound } from "next/navigation";
import { getPurchaseById } from "@/lib/actions/purchases";
import { prisma } from "@/lib/db";
import { PurchaseDetailClient } from "./_components/PurchaseDetailClient";

export default async function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const [purchase, contacts] = await Promise.all([
    getPurchaseById(params.id),
    prisma.contact.findMany({ where: { userId: "demo-user" }, include: { balance: true }, orderBy: { name: "asc" } }),
  ]);
  if (!purchase) notFound();
  return <PurchaseDetailClient purchase={purchase} contacts={contacts} />;
}
