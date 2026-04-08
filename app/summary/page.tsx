export const dynamic = "force-dynamic";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { SummaryClient } from "./_components/SummaryClient";
import { startOfWeek, startOfMonth, subMonths } from "date-fns";

export default async function SummaryPage() {
  const purchases = await prisma.purchase.findMany({
    where: { userId: DEMO_USER_ID },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return <SummaryClient purchases={purchases} />;
}
