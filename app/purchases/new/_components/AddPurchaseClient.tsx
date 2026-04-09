"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, DollarSign, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SplitModal } from "@/components/splits/SplitModal";
import { useToast } from "@/components/ui/use-toast";
import { createPurchase, generateSimulatedPurchase } from "@/lib/actions/purchases";
import { formatCents } from "@/lib/domain/splits";
import type { Category, Contact, Balance } from "@prisma/client";

const formSchema = z.object({
  merchant: z.string().min(1, "Required"),
  amount: z.string().min(1, "Required"),
  tax: z.string().optional().default("0"),
  tip: z.string().optional().default("0"),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  date: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type ContactWithBalance = Contact & { balance: Balance | null };

export function AddPurchaseClient({ categories, contacts, recentContactIds = [] }: { categories: Category[]; contacts: ContactWithBalance[]; recentContactIds?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [splitPurchaseId, setSplitPurchaseId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "simulate">("manual");

  // Pre-fill from URL params (used by iPhone Shortcut)
  const prefillMerchant = searchParams.get("merchant") ?? "";
  const prefillAmount = searchParams.get("amount") ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchant: prefillMerchant,
      amount: prefillAmount,
      tax: "",
      tip: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  async function onSubmit(values: FormValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => v && fd.append(k, v));
    fd.set("source", "MANUAL");

    const result = await createPurchase(fd);
    if ("error" in result) {
      toast({ title: "Error saving purchase", variant: "destructive" });
      return;
    }
    toast({ title: "Purchase saved!", description: values.merchant });
    setSplitPurchaseId(result.purchaseId);
  }

  async function handleSimulate() {
    setSimulating(true);
    try {
      const result = await generateSimulatedPurchase();
      toast({
        title: `Apple Pay — ${result.merchant}`,
        description: `${formatCents(result.amount + result.tax)} charged to your card`,
      });
      setSplitPurchaseId(result.purchaseId);
    } catch {
      toast({ title: "Simulation failed", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Purchase" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Tab switcher */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {[
            { key: "manual", label: "Manual", icon: FileText },
            { key: "simulate", label: "Simulate Apple Pay", icon: Zap },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Apple Pay Shortcut banner */}
        {prefillMerchant && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-foreground/5 border border-border text-sm">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span>Pre-filled from Apple Pay · <span className="font-semibold">{prefillMerchant}</span></span>
          </div>
        )}

        {activeTab === "simulate" ? (
          <Card className="border-2 border-dashed border-violet-200">
            <CardContent className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center">
                <Zap className="h-8 w-8 text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Simulate Apple Pay</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a realistic purchase to demo the split flow
                </p>
              </div>
              <Button className="w-full h-14 text-base" onClick={handleSimulate} disabled={simulating}>
                {simulating ? "Processing payment…" : "Tap to Pay"}
              </Button>
              <p className="text-xs text-muted-foreground">Randomized merchant, amount, and category</p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant</Label>
              <Input id="merchant" placeholder="e.g. Chipotle" {...form.register("merchant")} />
              {form.formState.errors.merchant && (
                <p className="text-xs text-destructive">{form.formState.errors.merchant.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="amount" className="pl-8" placeholder="0.00" type="number" step="0.01" min="0" {...form.register("amount")} />
                </div>
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="tax" className="pl-8" placeholder="0.00" type="number" step="0.01" min="0" {...form.register("tax")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tip">Tip</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="tip" className="pl-8" placeholder="0.00" type="number" step="0.01" min="0" {...form.register("tip")} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(v) => form.setValue("categoryId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="date" className="pl-8" type="date" {...form.register("date")} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" placeholder="Add a note…" rows={2} {...form.register("notes")} />
            </div>

            <Button type="submit" className="w-full h-14 text-base" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save Purchase"}
            </Button>
          </form>
        )}
      </div>

      {splitPurchaseId && (
        <SplitModal
          purchaseId={splitPurchaseId}
          contacts={contacts}
          recentContactIds={recentContactIds}
          open={!!splitPurchaseId}
          onClose={() => { setSplitPurchaseId(null); router.push("/"); }}
          onSuccess={() => { setSplitPurchaseId(null); router.push("/"); }}
        />
      )}
    </>
  );
}
