export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getPurchaseById } from "@/lib/actions/purchases";
import { prisma } from "@/lib/db";
import { PurchaseDetailClient } from "./_components/PurchaseDetailClient";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [purchase, contacts] = await Promise.all([
    getPurchaseById(id),
    prisma.contact.findMany({ where: { userId: "demo-user" }, include: { balance: true }, orderBy: { name: "asc" } }),
  ]);
  if (!purchase) notFound();
  return <PurchaseDetailClient purchase={purchase} contacts={contacts} />;
}
