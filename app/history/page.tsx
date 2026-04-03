import { prisma, DEMO_USER_ID } from "@/lib/db";
import { HistoryClient } from "./_components/HistoryClient";

export default async function HistoryPage() {
  const purchases = await prisma.purchase.findMany({
    where: { userId: DEMO_USER_ID },
    include: { category: true, splitParticipants: { include: { contact: true } } },
    orderBy: { date: "desc" },
  });
  return <HistoryClient purchases={purchases} />;
}
