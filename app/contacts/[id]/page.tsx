import { notFound } from "next/navigation";
import { getContactById } from "@/lib/actions/contacts";
import { ContactDetailClient } from "./_components/ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const contact = await getContactById(params.id);
  if (!contact) notFound();
  return <ContactDetailClient contact={contact} />;
}
