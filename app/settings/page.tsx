export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { SettingsClient } from "./_components/SettingsClient";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const stats = await prisma.$transaction([
    prisma.purchase.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.requestDraft.count({ where: { userId } }),
  ]);
  return <SettingsClient user={user} stats={{ purchases: stats[0], contacts: stats[1], requests: stats[2] }} />;
}
