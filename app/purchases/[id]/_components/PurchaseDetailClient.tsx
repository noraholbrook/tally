"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, SplitSquareVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { SplitModal } from "@/components/splits/SplitModal";
import { formatCents } from "@/lib/domain/splits";
import { formatDate } from "@/lib/utils";
import type { Purchase, Category, PurchaseItem, SplitParticipant, Contact, Balance, SplitAllocation } from "@prisma/client";

type PurchaseDetail = Purchase & {
  category: Category | null;
  items: PurchaseItem[];
  splitParticipants: (SplitParticipant & {
    contact: Contact;
    allocations: (SplitAllocation & { purchaseItem: PurchaseItem })[];
  })[];
};

type ContactWithBalance = Contact & { balance: Balance | null };

export function PurchaseDetailClient({ purchase, contacts }: { purchase: PurchaseDetail; contacts: ContactWithBalance[] }) {
  const router = useRouter();
  const [showSplit, setShowSplit] = useState(false);
  const total = purchase.amount + purchase.tax + purchase.tip;

  return (
    <>
      <PageHeader title={purchase.merchant} showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Amount card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Total</p>
                <AmountDisplay cents={total} size="xl" className="mt-1" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                {purchase.category?.icon ?? "💳"}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{formatCents(purchase.amount)}</span>
              </div>
              {purchase.tax > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span><span>{formatCents(purchase.tax)}</span>
                </div>
              )}
              {purchase.tip > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tip</span><span>{formatCents(purchase.tip)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span><span>{formatCents(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(purchase.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{purchase.category ? `${purchase.category.icon} ${purchase.category.name}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <Badge variant="secondary" className="text-xs">
                {purchase.source === "SIMULATED" ? "Apple Pay (demo)" : purchase.source === "RECEIPT" ? "Receipt" : "Manual"}
              </Badge>
            </div>
            {purchase.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium text-right max-w-[60%]">{purchase.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Split section */}
        {purchase.isSplit && purchase.splitParticipants.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SplitSquareVertical className="h-4 w-4" /> Split
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {purchase.splitParticipants.map((sp) => (
                <div key={sp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ContactAvatar name={sp.contact.name} size="sm" />
                    <span className="text-sm font-medium">{sp.contact.name}</span>
                  </div>
                  <AmountDisplay cents={sp.shareValue} size="sm" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowSplit(true)}>
                Edit Split
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Button className="w-full h-14 text-base" onClick={() => setShowSplit(true)}>
            <Receipt className="h-5 w-5 mr-2" />
            Split This Purchase
          </Button>
        )}
      </div>

      <SplitModal
        purchaseId={purchase.id}
        contacts={contacts}
        open={showSplit}
        onClose={() => setShowSplit(false)}
        onSuccess={() => { setShowSplit(false); router.refresh(); }}
      />
    </>
  );
}
