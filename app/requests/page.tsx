export const dynamic = "force-dynamic";
import { getRequestDrafts } from "@/lib/actions/settlements";
import { RequestsClient } from "./_components/RequestsClient";

export default async function RequestsPage() {
  const drafts = await getRequestDrafts();
  return <RequestsClient drafts={drafts} />;
}
