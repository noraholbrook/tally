export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { BalancesClient } from "./_components/BalancesClient";

export default async function BalancesPage() {
  const userId = await getCurrentUserId();
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      balance: { include: { settlements: { orderBy: { settledAt: "desc" }, take: 3 } } },
    },
    orderBy: { name: "asc" },
  });
  return <BalancesClient contacts={contacts} />;
}
