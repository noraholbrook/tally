"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/layout/AppHeader";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatRelativeDate } from "@/lib/utils";
import type { Purchase, Category, SplitParticipant, Contact } from "@prisma/client";

type PurchaseWithRelations = Purchase & {
  category: Category | null;
  splitParticipants: (SplitParticipant & { contact: Contact })[];
};

export function HistoryClient({ purchases }: { purchases: PurchaseWithRelations[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = purchases.filter((p) =>
    p.merchant.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader page="History" />

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search purchases…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="🧾" title="No purchases found" description={search ? "Try different keywords" : "Add your first purchase"} />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/purchases/${p.id}`)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                    {p.category?.icon ?? "💳"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.merchant}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">{formatRelativeDate(p.date)}</p>
                      {p.isSplit && <Badge variant="success" className="text-[10px] py-0">Split</Badge>}
                      {p.source === "SIMULATED" && <Badge variant="secondary" className="text-[10px] py-0">Apple Pay</Badge>}
                    </div>
                  </div>
                  <AmountDisplay cents={p.amount + p.tax + p.tip} size="sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
