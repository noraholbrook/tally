import { prisma, DEMO_USER_ID } from "@/lib/db";
import { ContactsClient } from "./_components/ContactsClient";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    where: { userId: DEMO_USER_ID },
    include: { balance: true },
    orderBy: { name: "asc" },
  });
  return <ContactsClient contacts={contacts} />;
}
