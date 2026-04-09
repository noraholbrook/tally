"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCents } from "@/lib/domain/splits";
import { formatRelativeDate } from "@/lib/utils";
import { generateSimulatedPurchase } from "@/lib/actions/purchases";
import { useToast } from "@/components/ui/use-toast";
import { SplitModal } from "@/components/splits/SplitModal";
import { TallyLogo } from "@/components/ui/TallyLogo";
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

  const outstandingContacts = contacts.filter((c) => (c.balance?.outstanding ?? 0) > 0).slice(0, 3);

  // Derive recently-split-with contact IDs from purchase history (most recent first, deduped)
  const recentContactIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const p of purchases) {
      for (const sp of p.splitParticipants) {
        if (!seen.has(sp.contact.id)) {
          seen.add(sp.contact.id);
          ids.push(sp.contact.id);
        }
      }
      if (ids.length >= 4) break;
    }
    return ids;
  }, [purchases]);

  async function handleSimulate() {
    setSimulating(true);
    try {
      const result = await generateSimulatedPurchase();
      toast({
        title: `Apple Pay — ${result.merchant}`,
        description: `${formatCents(result.amount)} charged`,
        variant: "default",
      });
      setSplitPurchaseId(result.purchaseId);
    } catch {
      toast({ title: "Error", description: "Failed to simulate purchase", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <>
      <PageHeader
        logo={<TallyLogo size="md" />}
        subtitle={totalOutstanding > 0 ? `${formatCents(totalOutstanding)} outstanding` : "All settled up"}
        right={
          <Button size="icon-sm" variant="ghost" onClick={() => router.push("/purchases/new")}>
            <Plus className="h-5 w-5" />
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-5">
        {/* Outstanding banner */}
        {totalOutstanding > 0 && (
          <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wide">Total Outstanding</p>
                  <p className="text-3xl font-bold mt-1">{formatCents(totalOutstanding)}</p>
                  <p className="text-primary-foreground/70 text-xs mt-1">{outstandingContacts.length} people owe you</p>
                </div>
                <TrendingUp className="h-10 w-10 text-primary-foreground/30" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 flex-col gap-1 text-xs font-semibold"
            onClick={() => router.push("/purchases/new")}
          >
            <Plus className="h-5 w-5" />
            Add Purchase
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col gap-1 text-xs font-semibold border-violet-200 text-violet-700 hover:bg-violet-50"
            onClick={handleSimulate}
            disabled={simulating}
          >
            <Zap className="h-5 w-5" />
            {simulating ? "Processing…" : "Simulate Apple Pay"}
          </Button>
        </div>

        {/* Outstanding balances */}
        {outstandingContacts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Waiting on</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push("/balances")}>
                See all
              </Button>
            </div>
            <div className="space-y-2">
              {outstandingContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={contact.name} avatarUrl={contact.avatarUrl} size="md" />
                      <div>
                        <p className="font-semibold text-sm">{contact.name}</p>
                        {contact.venmoHandle && (
                          <p className="text-xs text-muted-foreground">{contact.venmoHandle}</p>
                        )}
                      </div>
                    </div>
                    <AmountDisplay cents={contact.balance!.outstanding} size="lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent purchases */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent</h2>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => router.push("/history")}>
              See all
            </Button>
          </div>

          {purchases.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="No purchases yet"
              description="Add your first purchase to get started"
              action={
                <Button onClick={() => router.push("/purchases/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Purchase
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <Card
                  key={purchase.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/purchases/${purchase.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                          {purchase.category?.icon ?? "💳"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{purchase.merchant}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{formatRelativeDate(purchase.date)}</p>
                            {purchase.source === "SIMULATED" && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Apple Pay</Badge>
                            )}
                            {purchase.source === "RECEIPT" && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Receipt</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <AmountDisplay cents={purchase.amount} size="md" />
                        {purchase.isSplit ? (
                          <Badge variant="success" className="text-[10px] py-0">Split</Badge>
                        ) : (
                          <button
                            className="text-[10px] text-primary font-medium hover:underline"
                            onClick={(e) => { e.stopPropagation(); setSplitPurchaseId(purchase.id); }}
                          >
                            Split it?
                          </button>
                        )}
                      </div>
                    </div>
                    {purchase.isSplit && purchase.splitParticipants.length > 0 && (
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                        <div className="flex -space-x-2">
                          {purchase.splitParticipants.slice(0, 4).map((sp) => (
                            <ContactAvatar key={sp.id} name={sp.contact.name} size="sm" className="border-2 border-background" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">
                          Split with {purchase.splitParticipants.map((sp) => sp.contact.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
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
    </>
  );
}
