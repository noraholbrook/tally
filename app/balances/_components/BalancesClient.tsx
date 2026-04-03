"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCents } from "@/lib/domain/splits";
import type { Contact, Balance, Settlement } from "@prisma/client";

type ContactWithBalance = Contact & {
  balance: (Balance & { settlements: Settlement[] }) | null;
};

export function BalancesClient({ contacts }: { contacts: ContactWithBalance[] }) {
  const router = useRouter();
  const withBalance = contacts.filter((c) => c.balance && c.balance.totalOwed > 0);
  const totalOutstanding = withBalance.reduce((s, c) => s + (c.balance?.outstanding ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Balances"
        subtitle={totalOutstanding > 0 ? `${formatCents(totalOutstanding)} total outstanding` : "All settled up"}
      />

      <div className="px-4 py-4 space-y-4">
        {withBalance.length === 0 ? (
          <EmptyState
            icon="✅"
            title="All settled up"
            description="No outstanding balances. Add purchases and split them to track who owes what."
          />
        ) : (
          withBalance.map((contact) => {
            const balance = contact.balance!;
            const paidPct = balance.totalOwed > 0 ? Math.round((balance.totalPaid / balance.totalOwed) * 100) : 0;
            return (
              <Card
                key={contact.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={contact.name} size="lg" />
                      <div>
                        <p className="font-bold">{contact.name}</p>
                        {contact.venmoHandle && <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <AmountDisplay cents={balance.outstanding} size="lg" />
                      {balance.outstanding === 0 ? (
                        <Badge variant="success" className="mt-1">Settled</Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">outstanding</p>
                      )}
                    </div>
                  </div>

                  <Progress value={paidPct} className="h-1.5 mb-2" />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paid {formatCents(balance.totalPaid)} of {formatCents(balance.totalOwed)}</span>
                    <span>{paidPct}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
