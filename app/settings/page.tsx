export const dynamic = "force-dynamic";
import { prisma, DEMO_USER_ID } from "@/lib/db";
import { SettingsClient } from "./_components/SettingsClient";

export default async function SettingsPage() {
  const user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  const stats = await prisma.$transaction([
    prisma.purchase.count({ where: { userId: DEMO_USER_ID } }),
    prisma.contact.count({ where: { userId: DEMO_USER_ID } }),
    prisma.requestDraft.count({ where: { userId: DEMO_USER_ID } }),
  ]);
  return <SettingsClient user={user} stats={{ purchases: stats[0], contacts: stats[1], requests: stats[2] }} />;
}
