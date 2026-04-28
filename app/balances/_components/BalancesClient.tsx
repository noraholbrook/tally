"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, DollarSign, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddContactSheet } from "@/app/contacts/_components/AddContactSheet";
import { updateContact, deleteContact } from "@/lib/actions/contacts";
import { settleBalance } from "@/lib/actions/settlements";
import { formatCents } from "@/lib/domain/splits";
import { buildVenmoRequestUrl, buildVenmoWebUrl, buildVenmoPayUrl } from "@/lib/venmo";
import { useToast } from "@/components/ui/use-toast";
import type { Contact, Balance, Settlement } from "@prisma/client";
import type { YouOweItem } from "@/app/balances/page";

type ContactWithBalance = Contact & {
  balance: (Balance & { settlements: Settlement[] }) | null;
};

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function openVenmoRequest(contact: ContactWithBalance, effectiveCents: number) {
  const note = `Hey ${contact.name.split(" ")[0]}! Here's your share from Tally 🧾`;
  const deepLink = buildVenmoRequestUrl({ handle: contact.venmoHandle!, amountCents: effectiveCents, note });
  const webUrl = buildVenmoWebUrl({ handle: contact.venmoHandle!, amountCents: effectiveCents, note });
  window.location.href = deepLink;
  setTimeout(() => { window.open(webUrl, "_blank"); }, 600);
}

function openVenmoPay(handle: string, amountCents: number, name: string) {
  const note = `Settling up with ${name.split(" ")[0]} via Tally 🧾`;
  const deepLink = buildVenmoPayUrl({ handle, amountCents, note });
  const webUrl = buildVenmoWebUrl({ handle, amountCents, note });
  window.location.href = deepLink;
  setTimeout(() => { window.open(webUrl, "_blank"); }, 600);
}

interface BalancesClientProps {
  contacts: ContactWithBalance[];
  youOweItems: YouOweItem[];
  counterDebtMap: Record<string, number>;
}

export function BalancesClient({ contacts, youOweItems, counterDebtMap }: BalancesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<ContactWithBalance | null>(null);
  const [editName, setEditName] = useState("");
  const [editVenmo, setEditVenmo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSettle, setShowSettle] = useState(false);

  // Compute effective outstanding (after netting cross-user debts)
  function effectiveOutstanding(contact: ContactWithBalance): number {
    const gross = contact.balance?.outstanding ?? 0;
    const counter = counterDebtMap[contact.id] ?? 0;
    return Math.max(0, gross - counter);
  }

  const outstanding = contacts.filter((c) => effectiveOutstanding(c) > 0);
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.venmoHandle ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(contact: ContactWithBalance) {
    setEditContact(contact);
    setEditName(contact.name);
    setEditVenmo(contact.venmoHandle ?? "");
    setEditPhone(contact.phone ?? "");
    setEditEmail(contact.email ?? "");
    const eff = effectiveOutstanding(contact);
    setSettleAmount(eff > 0 ? (eff / 100).toFixed(2) : "");
  }

  function closeEdit() {
    setEditContact(null);
    setShowSettle(false);
  }

  async function handleSave() {
    if (!editContact || !editName.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", editName.trim());
      if (editVenmo) fd.append("venmoHandle", editVenmo);
      if (editPhone) fd.append("phone", editPhone);
      if (editEmail) fd.append("email", editEmail);
      const result = await updateContact(editContact.id, fd);
      if ("error" in result) throw new Error();
      toast({ title: "Contact updated!" });
      closeEdit();
      router.refresh();
    } catch {
      toast({ title: "Error updating contact", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editContact) return;
    if (!confirm(`Delete ${editContact.name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteContact(editContact.id);
      toast({ title: `${editContact.name} deleted` });
      closeEdit();
      router.refresh();
    } catch {
      toast({ title: "Error deleting contact", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSettle() {
    if (!editContact) return;
    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(settleAmount) * 100);
      await settleBalance(editContact.id, amountCents);
      toast({ title: `Marked ${formatCents(amountCents)} as settled` });
      setShowSettle(false);
      closeEdit();
      router.refresh();
    } catch {
      toast({ title: "Error settling balance", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

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

      <div className="px-4 py-4 space-y-5 pb-32">

        {/* You owe — cross-user debts */}
        {youOweItems.length > 0 && !search && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />
              You Owe
            </h2>
            {youOweItems.map((item) => (
              <Card key={item.creditorUserId} className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={item.creditorName} size="lg" />
                      <div>
                        <p className="font-bold">{item.creditorName}</p>
                        <p className="text-xs text-muted-foreground">{item.creditorEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-destructive">
                        {formatCents(item.netCents)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">you owe</p>
                    </div>
                  </div>

                  {/* Show netting breakdown if applicable */}
                  {item.grossCents !== item.netCents && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatCents(item.grossCents)} they recorded − {formatCents(item.grossCents - item.netCents)} they owe you = {formatCents(item.netCents)} net
                    </p>
                  )}

                  {item.creditorVenmoHandle ? (
                    <button
                      onClick={() => openVenmoPay(item.creditorVenmoHandle!, item.netCents, item.creditorName)}
                      className="w-full h-9 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
                      style={{ backgroundColor: "#008CFF" }}
                    >
                      <span className="font-bold text-sm">V</span>
                      Pay {formatCents(item.netCents)} via Venmo
                    </button>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      {item.creditorName} hasn't added a Venmo handle
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Outstanding — contacts who owe you */}
        {outstanding.length > 0 && !search && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
              Owed to You
            </h2>
            {outstanding.map((contact) => {
              const balance = contact.balance!;
              const eff = effectiveOutstanding(contact);
              const counter = counterDebtMap[contact.id] ?? 0;
              const paidPct = balance.totalOwed > 0 ? Math.round((balance.totalPaid / balance.totalOwed) * 100) : 0;
              return (
                <Card
                  key={contact.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openEdit(contact)}
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
                        <AmountDisplay cents={eff} size="lg" />
                        {counter > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            net (−{formatCents(counter)} you owe)
                          </p>
                        )}
                        {counter === 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">outstanding</p>
                        )}
                      </div>
                    </div>
                    <Progress value={paidPct} className="h-1.5 mb-3" />
                    <div className="flex justify-between text-xs text-muted-foreground mb-3">
                      <span>Paid {formatCents(balance.totalPaid)} of {formatCents(balance.totalOwed)}</span>
                      <span>{paidPct}%</span>
                    </div>
                    {contact.venmoHandle ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); openVenmoRequest(contact, eff); }}
                        className="w-full h-9 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity active:opacity-80"
                        style={{ backgroundColor: "#008CFF" }}
                      >
                        <span className="font-bold text-sm">V</span>
                        Request {formatCents(eff)} via Venmo
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

        {/* All contacts */}
        <section className="space-y-3">
          {!search && (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Contacts</h2>
          )}
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
              {filtered.map((contact) => {
                const eff = effectiveOutstanding(contact);
                return (
                  <button
                    key={contact.id}
                    onClick={() => openEdit(contact)}
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
                      {eff > 0 ? (
                        <AmountDisplay cents={eff} size="sm" />
                      ) : (contact.balance?.totalOwed ?? 0) > 0 ? (
                        <Badge variant="success">Settled</Badge>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AddContactSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); router.refresh(); }}
      />

      {/* Edit contact dialog */}
      <Dialog open={!!editContact} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Jordan Lee" />
            </div>
            <div className="space-y-1.5">
              <Label>Venmo Handle</Label>
              <Input value={editVenmo} onChange={(e) => setEditVenmo(e.target.value)} placeholder="@jordanlee" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="(XXX) XXX-XXXX"
                value={editPhone}
                onChange={(e) => setEditPhone(formatPhone(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="jordan@example.com" />
            </div>

            {/* Settle balance inline */}
            {editContact && effectiveOutstanding(editContact) > 0 && (
              <div className="pt-1">
                {!showSettle ? (
                  <button
                    onClick={() => setShowSettle(true)}
                    className="w-full h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Mark Settled ({formatCents(effectiveOutstanding(editContact))})
                  </button>
                ) : (
                  <div className="space-y-2 rounded-xl border border-border p-3">
                    <Label>Amount received</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        type="number"
                        step="0.01"
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowSettle(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSettle} disabled={saving}>Confirm</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>Delete</Button>
              <Button onClick={handleSave} disabled={saving || !editName.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
