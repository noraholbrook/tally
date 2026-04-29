export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-utils";
import { BalancesClient } from "./_components/BalancesClient";

export type YouOweItem = {
  creditorName: string;
  creditorEmail: string | null;
  creditorUserId: string;
  creditorVenmoHandle: string | null;
  /** What they recorded you owe them (gross, before netting) */
  grossCents: number;
  /** After subtracting what they owe you per your own records */
  netCents: number;
  /** Your contact ID for them, if you have them in your contacts */
  myContactId: string | null;
};

export default async function BalancesPage() {
  const userId = await getCurrentUserId();

  // My contacts (what others owe me)
  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      balance: { include: { settlements: { orderBy: { settledAt: "desc" }, take: 3 } } },
    },
    orderBy: { name: "asc" },
  });

  // Contacts that OTHER users have created that are linked to me
  // These represent debts where someone says "you owe me"
  const theyRecordedIOwe = await prisma.contact.findMany({
    where: {
      linkedUserId: userId,
      balance: { outstanding: { gt: 0 } },
    },
    include: {
      balance: true,
      user: { select: { id: true, name: true, email: true, venmoHandle: true } },
    },
  });

  // Build "You owe" items with netting
  const youOweItems: YouOweItem[] = theyRecordedIOwe
    .map((theirContact) => {
      const creditorUserId = theirContact.userId;
      // Do I have them as a contact? (my contact's linkedUserId = creditorUserId)
      const myContactWithThem = contacts.find((c) => c.linkedUserId === creditorUserId);
      const theyOweMe = myContactWithThem?.balance?.outstanding ?? 0;
      const iOweThem = theirContact.balance!.outstanding;
      const netCents = iOweThem - theyOweMe;

      return {
        creditorName: theirContact.user.name,
        creditorEmail: theirContact.user.email,
        creditorUserId,
        creditorVenmoHandle: theirContact.user.venmoHandle ?? null,
        grossCents: iOweThem,
        netCents,
        myContactId: myContactWithThem?.id ?? null,
      };
    })
    // Only show where I truly owe after netting
    .filter((item) => item.netCents > 0);

  // Build a map so the client can reduce outstanding amounts on contacts
  // that have a counter-debt (e.g. B owes me $10 but I owe B $3 → show $7)
  const counterDebtMap: Record<string, number> = {};
  for (const item of youOweItems) {
    if (item.myContactId) {
      counterDebtMap[item.myContactId] = item.grossCents;
    }
  }
  // Also handle negative-net cases (they owe me more after netting):
  // those items were filtered out of youOweItems but the contact's outstanding
  // should still be reduced by what I owe them.
  for (const theirContact of theyRecordedIOwe) {
    const creditorUserId = theirContact.userId;
    const myContactWithThem = contacts.find((c) => c.linkedUserId === creditorUserId);
    if (myContactWithThem && !counterDebtMap[myContactWithThem.id]) {
      counterDebtMap[myContactWithThem.id] = theirContact.balance!.outstanding;
    }
  }

  return (
    <BalancesClient
      contacts={contacts}
      youOweItems={youOweItems}
      counterDebtMap={counterDebtMap}
    />
  );
}
