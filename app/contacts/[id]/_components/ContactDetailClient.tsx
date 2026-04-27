"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, DollarSign, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settleBalance } from "@/lib/actions/settlements";
import { updateContact } from "@/lib/actions/contacts";
import { useToast } from "@/components/ui/use-toast";
import { formatCents } from "@/lib/domain/splits";
import { formatRelativeDate } from "@/lib/utils";
import { buildVenmoRequestUrl, buildVenmoWebUrl } from "@/lib/venmo";
import type { Contact, Balance, Settlement, SplitParticipant, Purchase, Category, RequestDraft } from "@prisma/client";

type ContactDetail = Contact & {
  balance: (Balance & { settlements: Settlement[] }) | null;
  splitParticipants: (SplitParticipant & { purchase: Purchase & { category: Category | null } })[];
  requestDrafts: RequestDraft[];
};

export function ContactDetailClient({ contact }: { contact: ContactDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [showVenmo, setShowVenmo] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [editVenmo, setEditVenmo] = useState(contact.venmoHandle ?? "");
  const [editPhone, setEditPhone] = useState(contact.phone ?? "");
  const [editEmail, setEditEmail] = useState(contact.email ?? "");
  const [requestAmount, setRequestAmount] = useState(
    contact.balance?.outstanding ? (contact.balance.outstanding / 100).toFixed(2) : ""
  );
  const [requestNote, setRequestNote] = useState(
    `Hey ${contact.name.split(" ")[0]}! Here's your share from Tally 🧾`
  );
  const [settleAmount, setSettleAmount] = useState(
    contact.balance?.outstanding ? (contact.balance.outstanding / 100).toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);

  const balance = contact.balance;
  const paidPct = balance && balance.totalOwed > 0 ? Math.round((balance.totalPaid / balance.totalOwed) * 100) : 0;

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", editName.trim());
      if (editVenmo) fd.append("venmoHandle", editVenmo);
      if (editPhone) fd.append("phone", editPhone);
      if (editEmail) fd.append("email", editEmail);
      const result = await updateContact(contact.id, fd);
      if ("error" in result) throw new Error();
      toast({ title: "Contact updated!" });
      setShowEdit(false);
      router.refresh();
    } catch {
      toast({ title: "Error updating contact", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleOpenVenmo() {
    if (!contact.venmoHandle) {
      toast({
        title: "No Venmo handle",
        description: `Add ${contact.name}'s Venmo handle first`,
        variant: "destructive",
      });
      return;
    }
    setShowVenmo(true);
  }

  function openVenmo() {
    const amountCents = Math.round(parseFloat(requestAmount) * 100);
    const deepLink = buildVenmoRequestUrl({ handle: contact.venmoHandle!, amountCents, note: requestNote });
    const webUrl = buildVenmoWebUrl({ handle: contact.venmoHandle!, amountCents, note: requestNote });

    // Try app deep link; if Venmo isn't installed, fall back to web after 600ms
    window.location.href = deepLink;
    setTimeout(() => {
      window.open(webUrl, "_blank");
    }, 600);

    setShowVenmo(false);
  }

  async function handleSettle() {
    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(settleAmount) * 100);
      await settleBalance(contact.id, amountCents);
      toast({ title: "Balance updated!", description: `Marked ${formatCents(amountCents)} as settled` });
      setShowSettle(false);
      router.refresh();
    } catch {
      toast({ title: "Error settling balance", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={contact.name}
        showBack
        right={
          <Button size="icon-sm" variant="ghost" onClick={() => setShowEdit(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Profile */}
        <div className="flex flex-col items-center py-4 gap-3">
          <ContactAvatar name={contact.name} size="lg" className="h-20 w-20 text-xl" />
          <div className="text-center">
            <h2 className="text-xl font-bold">{contact.name}</h2>
            {contact.venmoHandle && (
              <p className="text-sm font-medium" style={{ color: "#008CFF" }}>{contact.venmoHandle}</p>
            )}
            {contact.email && <p className="text-muted-foreground text-xs mt-0.5">{contact.email}</p>}
          </div>
        </div>

        {/* Balance */}
        {balance ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Outstanding</p>
                  <AmountDisplay cents={balance.outstanding} size="xl" className="mt-1" />
                </div>
                {balance.outstanding === 0 ? (
                  <Badge variant="success" className="text-sm px-3 py-1">Settled ✓</Badge>
                ) : null}
              </div>
              <Progress value={paidPct} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCents(balance.totalPaid)} paid of {formatCents(balance.totalOwed)}</span>
                <span>{paidPct}%</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Actions */}
        {balance && balance.outstanding > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleOpenVenmo}
              className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl text-white text-xs font-semibold transition-opacity active:opacity-80"
              style={{ backgroundColor: "#008CFF" }}
            >
              {/* Venmo wordmark-style "V" */}
              <span className="text-lg font-bold leading-none">V</span>
              <span>Request via Venmo</span>
            </button>
            <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setShowSettle(true)}>
              <CheckCircle className="h-5 w-5" />
              Mark Settled
            </Button>
          </div>
        )}

        {/* No venmo handle warning */}
        {balance && balance.outstanding > 0 && !contact.venmoHandle && (
          <p className="text-xs text-center text-muted-foreground">
            Add {contact.name.split(" ")[0]}'s Venmo handle to enable direct requests
          </p>
        )}

        {/* Purchase history */}
        {contact.splitParticipants.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Purchase History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {contact.splitParticipants.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
                      {sp.purchase.category?.icon ?? "💳"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sp.purchase.merchant}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeDate(sp.purchase.date)}</p>
                    </div>
                  </div>
                  <AmountDisplay cents={sp.shareValue} size="sm" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={showEdit} onOpenChange={(o) => !o && setShowEdit(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Jordan Lee" />
            </div>
            <div className="space-y-2">
              <Label>Venmo Handle</Label>
              <Input value={editVenmo} onChange={(e) => setEditVenmo(e.target.value)} placeholder="@jordanlee" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="(XXX) XXX-XXXX"
                value={editPhone}
                onChange={(e) => setEditPhone(formatPhone(e.target.value))}
              />
              {editPhone && editPhone.replace(/\D/g, "").length !== 10 && editPhone.length > 0 && (
                <p className="text-xs text-destructive">Enter a 10-digit phone number</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="jordan@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Venmo Request Dialog */}
      <Dialog open={showVenmo} onOpenChange={(o) => !o && setShowVenmo(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request via Venmo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span style={{ color: "#008CFF" }} className="font-bold">V</span>
              <span>Requesting from <strong>{contact.venmoHandle}</strong></span>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  type="number"
                  step="0.01"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea rows={2} value={requestNote} onChange={(e) => setRequestNote(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowVenmo(false)}>Cancel</Button>
              <button
                onClick={openVenmo}
                className="flex items-center justify-center gap-2 h-10 rounded-lg text-white text-sm font-semibold transition-opacity active:opacity-80"
                style={{ backgroundColor: "#008CFF" }}
              >
                <ExternalLink className="h-4 w-4" />
                Open Venmo
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Dialog */}
      <Dialog open={showSettle} onOpenChange={(o) => !o && setShowSettle(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Settled</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Record a payment from {contact.name}.</p>
            <div className="space-y-2">
              <Label>Amount received</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" type="number" step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowSettle(false)}>Cancel</Button>
              <Button variant="success" onClick={handleSettle} disabled={saving}>{saving ? "Saving…" : "Confirm"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
