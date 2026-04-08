export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getContactById } from "@/lib/actions/contacts";
import { ContactDetailClient } from "./_components/ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContactById(id);
  if (!contact) notFound();
  return <ContactDetailClient contact={contact} />;
}
