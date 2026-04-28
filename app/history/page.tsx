export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { HistoryClient } from "./_components/HistoryClient";

export default async function HistoryPage() {
  const userId = await getCurrentUserId();
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: { category: true, splitParticipants: { include: { contact: true } } },
    orderBy: { date: "desc" },
  });
  return <HistoryClient purchases={purchases} />;
}
