export const dynamic = "force-dynamic";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { BalancesClient } from "./_components/BalancesClient";

export default async function BalancesPage() {
  const contacts = await prisma.contact.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      balance: { include: { settlements: { orderBy: { settledAt: "desc" }, take: 3 } } },
    },
    orderBy: { name: "asc" },
  });
  return <BalancesClient contacts={contacts} />;
}
