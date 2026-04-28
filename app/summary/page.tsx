export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { SummaryClient } from "./_components/SummaryClient";

export default async function SummaryPage() {
  const userId = await getCurrentUserId();
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
  });
  return <SummaryClient purchases={purchases} />;
}
