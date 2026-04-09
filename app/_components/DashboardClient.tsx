"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Zap, ChevronRight, Settings } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { SplitModal } from "@/components/splits/SplitModal";
import { formatCents } from "@/lib/domain/splits";
import { formatRelativeDate } from "@/lib/utils";
import { generateSimulatedPurchase } from "@/lib/actions/purchases";
import { useToast } from "@/components/ui/use-toast";
import type { Purchase, Category, Contact, Balance, SplitParticipant } from "@prisma/client";

type PurchaseWithRelations = Purchase & {
  category: Category | null;
  splitParticipants: (SplitParticipant & { contact: Contact })[];
};
type ContactWithBalance = Contact & { balance: Balance | null };

interface DashboardClientProps {
  purchases: PurchaseWithRelations[];
  contacts: ContactWithBalance[];
  categories: Category[];
  totalOutstanding: number;
}

export function DashboardClient({ purchases, contacts, categories, totalOutstanding }: DashboardClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [splitPurchaseId, setSplitPurchaseId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const outstandingContacts = contacts
    .filter((c) => (c.balance?.outstanding ?? 0) > 0)
    .sort((a, b) => (b.balance?.outstanding ?? 0) - (a.balance?.outstanding ?? 0));

  const recentContactIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const p of purchases) {
      for (const sp of p.splitParticipants) {
        if (!seen.has(sp.contact.id)) { seen.add(sp.contact.id); ids.push(sp.contact.id); }
      }
      if (ids.length >= 4) break;
    }
    return ids;
  }, [purchases]);

  async function handleSimulate() {
    setSimulating(true);
    try {
      const result = await generateSimulatedPurchase();
      toast({ title: `Apple Pay — ${result.merchant}`, description: `${formatCents(result.amount)} charged` });
      setSplitPurchaseId(result.purchaseId);
    } catch {
      toast({ title: "Error", description: "Failed to simulate purchase", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-36">

      {/* ── Header ── */}
      <AppHeader page="Home" />

      {/* ── Hero ── */}
      <div className="px-5 pt-4 pb-6">
        <p className="text-4xl font-bold tracking-tight">{formatCents(totalOutstanding)}</p>
        <p className="text-muted-foreground text-sm mt-1">You&apos;re owed</p>
        {outstandingContacts.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {outstandingContacts.length} {outstandingContacts.length === 1 ? "person owes" : "people owe"} you
          </p>
        )}
      </div>

      {/* ── People who owe you ── */}
      {outstandingContacts.length > 0 && (
        <section className="px-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">People who owe you</h2>
            <button onClick={() => router.push("/balances")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              See all
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {outstandingContacts.slice(0, 4).map((contact) => (
              <button
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
              >
                <ContactAvatar name={contact.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{contact.name}</p>
                  {contact.venmoHandle && (
                    <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-semibold text-sm">{formatCents(contact.balance!.outstanding)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent activity ── */}
      <section className="px-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent activity</h2>
          <button onClick={() => router.push("/history")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            See all
          </button>
        </div>

        {purchases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-3xl mb-2">🧾</p>
            <p className="text-sm font-medium">No purchases yet</p>
            <p className="text-xs mt-1">Simulate an Apple Pay purchase below</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {purchases.slice(0, 6).map((purchase) => (
              <button
                key={purchase.id}
                onClick={() => router.push(`/purchases/${purchase.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
              >
                {/* Merchant icon */}
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                  {purchase.category?.icon ?? "💳"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{purchase.merchant}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(purchase.date)}</p>
                    {(purchase.source === "SIMULATED" || purchase.source === "APPLE_PAY") && (
                      <span className="text-xs text-muted-foreground">· Apple Pay</span>
                    )}
                    {purchase.source === "RECEIPT" && (
                      <span className="text-xs text-muted-foreground">· Receipt</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCents(purchase.amount)}</p>
                    {purchase.isSplit ? (
                      <p className="text-[10px] text-green-600 font-medium">Split</p>
                    ) : (
                      <button
                        className="text-[10px] text-primary font-medium hover:underline"
                        onClick={(e) => { e.stopPropagation(); setSplitPurchaseId(purchase.id); }}
                      >
                        Split it?
                      </button>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Simulate Apple Pay — fixed above nav ── */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" />
          {simulating ? "Processing…" : "Simulate Apple Pay"}
        </button>
      </div>

      {splitPurchaseId && (
        <SplitModal
          purchaseId={splitPurchaseId}
          contacts={contacts}
          recentContactIds={recentContactIds}
          open={!!splitPurchaseId}
          onClose={() => setSplitPurchaseId(null)}
          onSuccess={() => { setSplitPurchaseId(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
