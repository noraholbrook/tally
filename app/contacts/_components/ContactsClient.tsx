"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddContactSheet } from "./AddContactSheet";
import type { Contact, Balance } from "@prisma/client";

type ContactWithBalance = Contact & { balance: Balance | null };

export function ContactsClient({ contacts }: { contacts: ContactWithBalance[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Contacts"
        right={
          <Button size="icon-sm" variant="ghost" onClick={() => setShowAdd(true)}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title={search ? "No results" : "No contacts yet"}
            description={search ? "Try a different name" : "Add people you split purchases with"}
            action={!search ? <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add Contact</Button> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((contact) => (
              <Card
                key={contact.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <ContactAvatar name={contact.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.venmoHandle ?? contact.email ?? contact.phone ?? "No contact info"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.balance && contact.balance.outstanding > 0 ? (
                      <AmountDisplay cents={contact.balance.outstanding} size="sm" />
                    ) : contact.balance && contact.balance.totalOwed > 0 ? (
                      <Badge variant="success">Settled</Badge>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddContactSheet open={showAdd} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); router.refresh(); }} />
    </>
  );
}
