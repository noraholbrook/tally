"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDraft, settleBalance } from "@/lib/actions/settlements";
import { useToast } from "@/components/ui/use-toast";
import { formatCents } from "@/lib/domain/splits";
import { formatRelativeDate } from "@/lib/utils";
import type { Contact, Balance, Settlement, SplitParticipant, Purchase, Category, RequestDraft } from "@prisma/client";

type ContactDetail = Contact & {
  balance: (Balance & { settlements: Settlement[] }) | null;
  splitParticipants: (SplitParticipant & { purchase: Purchase & { category: Category | null } })[];
  requestDrafts: RequestDraft[];
};

export function ContactDetailClient({ contact }: { contact: ContactDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showRequest, setShowRequest] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [requestAmount, setRequestAmount] = useState(
    contact.balance?.outstanding ? (contact.balance.outstanding / 100).toFixed(2) : ""
  );
  const [requestMessage, setRequestMessage] = useState(
    `Hey ${contact.name.split(" ")[0]}! Sending you a payment request via Tally 🧾`
  );
  const [settleAmount, setSettleAmount] = useState(
    contact.balance?.outstanding ? (contact.balance.outstanding / 100).toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);

  const balance = contact.balance;
  const paidPct = balance && balance.totalOwed > 0 ? Math.round((balance.totalPaid / balance.totalOwed) * 100) : 0;

  async function handleCreateRequest() {
    setSaving(true);
    try {
      const amountCents = Math.round(parseFloat(requestAmount) * 100);
      await createDraft(contact.id, amountCents, undefined, requestMessage);
      toast({ title: "Request draft created!", description: `For ${formatCents(amountCents)}` });
      setShowRequest(false);
      router.push("/requests");
    } catch {
      toast({ title: "Error creating request", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
      <PageHeader title={contact.name} showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <div className="flex flex-col items-center py-4 gap-3">
          <ContactAvatar name={contact.name} size="lg" className="h-20 w-20 text-xl" />
          <div className="text-center">
            <h2 className="text-xl font-bold">{contact.name}</h2>
            {contact.venmoHandle && <p className="text-muted-foreground text-sm">{contact.venmoHandle}</p>}
            {contact.email && <p className="text-muted-foreground text-xs">{contact.email}</p>}
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
            <Button className="h-14 flex-col gap-1 text-xs" onClick={() => setShowRequest(true)}>
              <Send className="h-5 w-5" />
              Venmo Request
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1 text-xs" onClick={() => setShowSettle(true)}>
              <CheckCircle className="h-5 w-5" />
              Mark Settled
            </Button>
          </div>
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

      {/* Venmo Request Dialog */}
      <Dialog open={showRequest} onOpenChange={(o) => !o && setShowRequest(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Venmo Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" type="number" step="0.01" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea rows={3} value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowRequest(false)}>Cancel</Button>
              <Button onClick={handleCreateRequest} disabled={saving}>{saving ? "Saving…" : "Create Draft"}</Button>
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
