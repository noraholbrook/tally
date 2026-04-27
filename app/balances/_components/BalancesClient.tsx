"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddContactSheet } from "@/app/contacts/_components/AddContactSheet";
import { formatCents } from "@/lib/domain/splits";
import { buildVenmoRequestUrl, buildVenmoWebUrl } from "@/lib/venmo";
import type { Contact, Balance, Settlement } from "@prisma/client";

type ContactWithBalance = Contact & {
  balance: (Balance & { settlements: Settlement[] }) | null;
};

function openVenmo(contact: ContactWithBalance) {
  const amountCents = contact.balance?.outstanding ?? 0;
  const note = `Hey ${contact.name.split(" ")[0]}! Here's your share from Tally 🧾`;
  const deepLink = buildVenmoRequestUrl({ handle: contact.venmoHandle!, amountCents, note });
  const webUrl = buildVenmoWebUrl({ handle: contact.venmoHandle!, amountCents, note });
  window.location.href = deepLink;
  setTimeout(() => { window.open(webUrl, "_blank"); }, 600);
}

export function BalancesClient({ contacts }: { contacts: ContactWithBalance[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const outstanding = contacts.filter((c) => (c.balance?.outstanding ?? 0) > 0);
  const totalOutstanding = outstanding.reduce((s, c) => s + (c.balance?.outstanding ?? 0), 0);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.venmoHandle ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader
        page="People"
        right={
          <Button size="icon-sm" variant="ghost" onClick={() => setShowAdd(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-5 pb-24">

        {/* ── Outstanding balances ── */}
        {outstanding.length > 0 && !search && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding</h2>
            {outstanding.map((contact) => {
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
                          {contact.venmoHandle && (
                            <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <AmountDisplay cents={balance.outstanding} size="lg" />
                        <p className="text-xs text-muted-foreground mt-0.5">outstanding</p>
                      </div>
                    </div>
                    <Progress value={paidPct} className="h-1.5 mb-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mb-3">
                      <span>Paid {formatCents(balance.totalPaid)} of {formatCents(balance.totalOwed)}</span>
                      <span>{paidPct}%</span>
                    </div>
                    {contact.venmoHandle ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); openVenmo(contact); }}
                        className="w-full h-9 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
                        style={{ backgroundColor: "#008CFF" }}
                      >
                        <span className="font-bold text-sm">V</span>
                        Request {formatCents(balance.outstanding)} via Venmo
                      </button>
                    ) : (
                      <p className="text-xs text-center text-muted-foreground">
                        Add Venmo handle to enable quick requests
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {/* ── All contacts ── */}
        <section className="space-y-3">
          {!search && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Contacts</h2>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-10 rounded-xl border border-border bg-muted/40 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {contacts.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No contacts yet"
              description="Add people you split purchases with"
              action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon="🔍" title="No results" description={`No contacts match "${search}"`} />
          ) : (
            <div className="space-y-2">
              {filtered.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-all text-left"
                >
                  <ContactAvatar name={contact.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.venmoHandle ?? contact.email ?? contact.phone ?? "No contact info"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(contact.balance?.outstanding ?? 0) > 0 ? (
                      <AmountDisplay cents={contact.balance!.outstanding} size="sm" />
                    ) : (contact.balance?.totalOwed ?? 0) > 0 ? (
                      <Badge variant="success">Settled</Badge>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <AddContactSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); router.refresh(); }}
      />
    </>
  );
}
