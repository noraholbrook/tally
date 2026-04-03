"use client";

import { useState, useEffect } from "react";
import { Check, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createSplit } from "@/lib/actions/splits";
import { calculateSplit, formatCents } from "@/lib/domain/splits";
import { useToast } from "@/components/ui/use-toast";
import { ShareType } from "@/lib/constants";
import type { Contact, Balance } from "@prisma/client";

type ContactWithBalance = Contact & { balance: Balance | null };

type SplitStep = "prompt" | "select" | "configure" | "preview";

interface SplitModalProps {
  purchaseId: string;
  contacts: ContactWithBalance[];
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SplitModal({ purchaseId, contacts, open, onClose, onSuccess }: SplitModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<SplitStep>("prompt");
  const [purchase, setPurchase] = useState<{ merchant: string; amount: number; tax: number; tip: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<ShareType>(ShareType.EQUAL);
  const [includeTax, setIncludeTax] = useState(true);
  const [includeTip, setIncludeTip] = useState(true);
  const [saving, setSaving] = useState(false);

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
    }
  }, [open, purchaseId]);

  const totalCents = purchase
    ? purchase.amount + (includeTax ? purchase.tax : 0) + (includeTip ? purchase.tip : 0)
    : 0;

  const preview =
    selectedIds.length > 0
      ? calculateSplit({
          totalCents,
          participants: selectedIds.map((id) => ({ contactId: id, shareType: splitType, shareValue: Math.floor(totalCents / selectedIds.length) })),
        })
      : null;

  function toggleContact(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const result = await createSplit({ purchaseId, contactIds: selectedIds, splitType, includeTax, includeTip });
      if ("error" in result) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Split saved!", description: `Split with ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`, variant: "default" });
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

        {step === "select" && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-5 border-b">
              <DialogTitle>Who&apos;s splitting?</DialogTitle>
              <DialogDescription className="text-xs mt-1">Select everyone who shared this purchase</DialogDescription>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {contacts.map((contact) => {
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
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
              {contacts.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No contacts yet. Add some in Contacts.</p>
              )}
            </div>
            <div className="p-4 border-t space-y-2">
              <Button
                className="w-full h-12"
                disabled={selectedIds.length === 0}
                onClick={() => setStep("configure")}
              >
                Continue with {selectedIds.length > 0 ? `${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}` : "selection"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("prompt")}>Back</Button>
            </div>
          </div>
        )}

        {step === "configure" && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-5 border-b">
              <DialogTitle>Split options</DialogTitle>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-5">
              {/* Split type */}
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

              {/* Preview */}
              {preview && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Each person pays</Label>
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
                    <span>Total split</span>
                    <span>{formatCents(totalCents)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t space-y-2">
              <Button className="w-full h-12" onClick={() => setStep("preview")}>Preview split</Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("select")}>Back</Button>
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="flex flex-col max-h-[80vh]">
            <div className="p-5 border-b">
              <DialogTitle>Confirm split</DialogTitle>
              <DialogDescription className="text-xs mt-1">This will update balances for each person</DialogDescription>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
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
