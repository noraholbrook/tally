import { getDashboardData } from "@/lib/actions/purchases";
import { DashboardClient } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient {...data} />;
}
