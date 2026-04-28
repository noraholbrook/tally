import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Returns the current authenticated user's ID.
 * Redirects to /login if not authenticated.
 * Must be called BEFORE any try/catch blocks.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}
