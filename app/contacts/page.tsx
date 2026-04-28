export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { ContactsClient } from "./_components/ContactsClient";

export default async function ContactsPage() {
  const userId = await getCurrentUserId();
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: { balance: true },
    orderBy: { name: "asc" },
  });
  return <ContactsClient contacts={contacts} />;
}
