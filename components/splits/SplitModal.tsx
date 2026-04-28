"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronRight, Users, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createSplit } from "@/lib/actions/splits";
import { calculateSplit, formatCents, parseDollarsToCents } from "@/lib/domain/splits";
import { useToast } from "@/components/ui/use-toast";
import { ShareType } from "@/lib/constants";
import type { Contact, Balance } from "@prisma/client";

type ContactWithBalance = Contact & { balance: Balance | null };
type SplitStep = "prompt" | "select" | "configure" | "preview";

interface SplitModalProps {
  purchaseId: string;
  contacts: ContactWithBalance[];
  recentContactIds?: string[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SplitModal({ purchaseId, contacts, recentContactIds = [], open, onClose, onSuccess }: SplitModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<SplitStep>("prompt");
  const [purchase, setPurchase] = useState<{ merchant: string; amount: number; tax: number; tip: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<ShareType>(ShareType.EQUAL);
  const [includeTax, setIncludeTax] = useState(true);
  const [includeTip, setIncludeTip] = useState(true);
  const [shareValues, setShareValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch purchase details when modal opens
  useEffect(() => {
    if (open && purchaseId) {
      fetch(`/api/purchases/${purchaseId}`)
        .then((r) => r.json())
        .then((data) => setPurchase(data))
        .catch(() => {});
      setStep("prompt");
      setSelectedIds([]);
      setSplitType(ShareType.EQUAL);
      setIncludeTax(true);
      setIncludeTip(true);
      setSearch("");
    }
  }, [open, purchaseId]);

  const totalCents = purchase
    ? purchase.amount + (includeTax ? purchase.tax : 0) + (includeTip ? purchase.tip : 0)
    : 0;

  // Reset shareValues whenever type or selected contacts change
  // Always divide by N+1 (contacts + Me) so "Me" keeps their own share
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const total = selectedIds.length + 1; // +1 for Me
    if (splitType === ShareType.PERCENTAGE) {
      const evenPct = Math.floor(10000 / total);
      const vals: Record<string, number> = {};
      selectedIds.forEach((id) => { vals[id] = evenPct; });
      setShareValues(vals);
    } else if (splitType === ShareType.FIXED) {
      const evenFixed = Math.floor(totalCents / total);
      const vals: Record<string, number> = {};
      selectedIds.forEach((id) => { vals[id] = evenFixed; });
      setShareValues(vals);
    }
  }, [splitType, selectedIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // For EQUAL, each contact owes totalCents / (N+1); Me keeps the rest
  const perContactEqual = selectedIds.length > 0
    ? Math.floor(totalCents / (selectedIds.length + 1))
    : 0;
  const myShare = totalCents - perContactEqual * selectedIds.length;

  const participants = selectedIds.map((id) => {
    const sv = splitType === ShareType.EQUAL
      ? perContactEqual
      : (shareValues[id] ?? 0);
    return { contactId: id, shareType: splitType, shareValue: sv };
  });

  const preview = selectedIds.length > 0 ? calculateSplit({ totalCents, participants, totalPeople: selectedIds.length + 1 }) : null;

  // Validation for non-equal types
  const percentageTotal = splitType === ShareType.PERCENTAGE
    ? selectedIds.reduce((s, id) => s + (shareValues[id] ?? 0), 0)
    : 10000;
  const fixedTotal = splitType === ShareType.FIXED
    ? selectedIds.reduce((s, id) => s + (shareValues[id] ?? 0), 0)
    : totalCents;
  const isValid = splitType === ShareType.EQUAL
    || (splitType === ShareType.PERCENTAGE && percentageTotal === 10000)
    || (splitType === ShareType.FIXED && fixedTotal <= totalCents);

  function toggleContact(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function updateShareValue(id: string, raw: string) {
    if (splitType === ShareType.PERCENTAGE) {
      const pct = Math.round(parseFloat(raw || "0") * 100);
      setShareValues((prev) => ({ ...prev, [id]: pct }));
    } else if (splitType === ShareType.FIXED) {
      setShareValues((prev) => ({ ...prev, [id]: parseDollarsToCents(raw) }));
    }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const result = await createSplit({ purchaseId, contactIds: selectedIds, splitType, includeTax, includeTip, customShares: splitType !== ShareType.EQUAL ? shareValues : undefined });
      if ("error" in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Split saved!", description: `Split with ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}` });
      onSuccess();
    } catch {
      toast({ title: "Failed to save split", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">

        {/* ── PROMPT ── */}
        {step === "prompt" && (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Split this purchase?</DialogTitle>
              {purchase && (
                <p className="text-muted-foreground text-sm mt-1">
                  {purchase.merchant} · {formatCents(purchase.amount + purchase.tax + purchase.tip)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12" onClick={onClose}>No, keep it</Button>
              <Button className="h-12" onClick={() => setStep("select")}>Yes, split it</Button>
            </div>
          </div>
        )}

        {/* ── SELECT CONTACTS ── */}
        {step === "select" && (() => {
          const q = search.trim().toLowerCase();
          const recentContacts = recentContactIds
            .map((id) => contacts.find((c) => c.id === id))
            .filter(Boolean) as ContactWithBalance[];
          const filteredContacts = q
            ? contacts.filter((c) =>
                c.name.toLowerCase().includes(q) ||
                (c.venmoHandle ?? "").toLowerCase().includes(q) ||
                (c.email ?? "").toLowerCase().includes(q)
              )
            : contacts;
          const showRecent = !q && recentContacts.length > 0;
          const otherContacts = showRecent
            ? filteredContacts.filter((c) => !recentContactIds.includes(c.id))
            : filteredContacts;

          const ContactRow = ({ contact }: { contact: ContactWithBalance }) => {
            const selected = selectedIds.includes(contact.id);
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                <ContactAvatar name={contact.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{contact.name}</p>
                  {contact.venmoHandle && <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>}
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          };

          return (
            <div className="flex flex-col max-h-[85vh]">
              <div className="p-5 border-b">
                <DialogTitle>Who&apos;s splitting?</DialogTitle>
                <DialogDescription className="text-xs mt-1">Select everyone who shared this purchase</DialogDescription>
                {/* Search bar */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search contacts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-muted/40 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Recently split with */}
                {showRecent && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Clock className="h-3 w-3" /> Recently split with
                    </p>
                    {recentContacts.map((c) => <ContactRow key={c.id} contact={c} />)}
                  </div>
                )}

                {/* All / search results */}
                {otherContacts.length > 0 && (
                  <div className="space-y-2">
                    {showRecent && (
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All contacts</p>
                    )}
                    {otherContacts.map((c) => <ContactRow key={c.id} contact={c} />)}
                  </div>
                )}

                {filteredContacts.length === 0 && q && (
                  <p className="text-center text-muted-foreground text-sm py-8">No contacts match &ldquo;{search}&rdquo;</p>
                )}
                {contacts.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No contacts yet. Add some in Contacts.</p>
                )}
              </div>

              <div className="p-4 border-t space-y-2">
                <Button className="w-full h-12" disabled={selectedIds.length === 0} onClick={() => setStep("configure")}>
                  Continue with {selectedIds.length > 0 ? `${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}` : "selection"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep("prompt")}>Back</Button>
              </div>
            </div>
          );
        })()}

        {/* ── CONFIGURE ── */}
        {step === "configure" && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-5 border-b">
              <DialogTitle>Split options</DialogTitle>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-5">

              {/* Split method toggle */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Split method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([ShareType.EQUAL, ShareType.PERCENTAGE, ShareType.FIXED] as ShareType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSplitType(type)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${splitType === type ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {type === ShareType.EQUAL ? "Equal" : type === ShareType.PERCENTAGE ? "Percentage" : "Fixed"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax/tip toggles */}
              {purchase && purchase.tax > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Include tax</Label>
                    <p className="text-xs text-muted-foreground">{formatCents(purchase.tax)}</p>
                  </div>
                  <Switch checked={includeTax} onCheckedChange={setIncludeTax} />
                </div>
              )}
              {purchase && purchase.tip > 0 && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Include tip</Label>
                    <p className="text-xs text-muted-foreground">{formatCents(purchase.tip)}</p>
                  </div>
                  <Switch checked={includeTip} onCheckedChange={setIncludeTip} />
                </div>
              )}

              {/* EQUAL — show auto preview including Me */}
              {splitType === ShareType.EQUAL && preview && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Each person pays</Label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">M</div>
                      <span className="text-sm font-medium">Me</span>
                    </div>
                    <AmountDisplay cents={myShare} size="sm" />
                  </div>
                  {preview.results.map((r) => {
                    const contact = contacts.find((c) => c.id === r.contactId);
                    return (
                      <div key={r.contactId} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-2">
                          {contact && <ContactAvatar name={contact.name} size="sm" />}
                          <span className="text-sm font-medium">{contact?.name ?? r.contactId}</span>
                        </div>
                        <AmountDisplay cents={r.amountCents} size="sm" />
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                    <span>Total</span>
                    <span>{formatCents(totalCents)}</span>
                  </div>
                </div>
              )}

              {/* PERCENTAGE — per-person % inputs */}
              {splitType === ShareType.PERCENTAGE && (
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Set percentages</Label>
                  {selectedIds.map((id) => {
                    const contact = contacts.find((c) => c.id === id);
                    const pctValue = ((shareValues[id] ?? 0) / 100).toFixed(0);
                    return (
                      <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        {contact && <ContactAvatar name={contact.name} size="sm" />}
                        <span className="text-sm font-medium flex-1">{contact?.name}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={pctValue}
                            onChange={(e) => updateShareValue(id, e.target.value)}
                            className="w-16 h-8 text-right text-sm"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className={`flex justify-between text-xs font-medium px-1 ${percentageTotal === 10000 ? "text-green-600" : "text-destructive"}`}>
                    <span>Total</span>
                    <span>{(percentageTotal / 100).toFixed(0)}% {percentageTotal !== 10000 && `(must equal 100%)`}</span>
                  </div>
                  {/* Live preview */}
                  {preview && percentageTotal <= 10000 && (
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Preview</Label>
                      <div className="flex justify-between text-sm px-1">
                        <span className="font-medium">Me</span>
                        <AmountDisplay cents={totalCents - preview.totalAllocated} size="sm" />
                      </div>
                      {preview.results.map((r) => {
                        const contact = contacts.find((c) => c.id === r.contactId);
                        return (
                          <div key={r.contactId} className="flex justify-between text-sm px-1">
                            <span className="text-muted-foreground">{contact?.name}</span>
                            <AmountDisplay cents={r.amountCents} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* FIXED — per-person $ inputs */}
              {splitType === ShareType.FIXED && (
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Set amounts</Label>
                  {selectedIds.map((id) => {
                    const contact = contacts.find((c) => c.id === id);
                    const dollarValue = ((shareValues[id] ?? 0) / 100).toFixed(2);
                    return (
                      <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        {contact && <ContactAvatar name={contact.name} size="sm" />}
                        <span className="text-sm font-medium flex-1">{contact?.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={dollarValue}
                            onChange={(e) => updateShareValue(id, e.target.value)}
                            className="w-20 h-8 text-right text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className={`flex justify-between text-xs font-medium px-1 ${fixedTotal <= totalCents ? "text-green-600" : "text-destructive"}`}>
                    <span>Me keeps</span>
                    <span>{formatCents(totalCents - fixedTotal)} · {formatCents(fixedTotal)} allocated</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-2">
              <Button className="w-full h-12" disabled={!isValid} onClick={() => setStep("preview")}>
                Preview split
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("select")}>Back</Button>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {step === "preview" && preview && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-5 border-b">
              <DialogTitle>Confirm split</DialogTitle>
              <DialogDescription className="text-xs mt-1">This will update balances for each person</DialogDescription>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {/* Me row */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">M</div>
                  <p className="font-semibold text-sm">Me</p>
                </div>
                <div className="text-right">
                  <AmountDisplay cents={totalCents - preview.totalAllocated} size="md" />
                  <p className="text-xs text-muted-foreground mt-0.5">my share</p>
                </div>
              </div>
              {preview.results.map((r) => {
                const contact = contacts.find((c) => c.id === r.contactId);
                return (
                  <div key={r.contactId} className="flex items-center justify-between p-4 rounded-xl border">
                    <div className="flex items-center gap-3">
                      {contact && <ContactAvatar name={contact.name} size="md" />}
                      <div>
                        <p className="font-semibold text-sm">{contact?.name}</p>
                        {contact?.venmoHandle && <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <AmountDisplay cents={r.amountCents} size="md" />
                      <p className="text-xs text-muted-foreground mt-0.5">owes you</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center px-1 text-sm font-semibold border-t pt-3 mt-2">
                <span>Total</span>
                <span>{formatCents(totalCents)}</span>
              </div>
            </div>
            <div className="p-4 border-t space-y-2">
              <Button className="w-full h-12" onClick={handleConfirm} disabled={saving}>
                {saving ? "Saving…" : "Confirm & Save Split"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("configure")}>Back</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
