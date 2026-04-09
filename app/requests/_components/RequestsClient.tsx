"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Send, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { EmptyState } from "@/components/shared/EmptyState";
import { Textarea } from "@/components/ui/textarea";
import { sendDraft, settleDraft, updateDraftMessage } from "@/lib/actions/settlements";
import { useToast } from "@/components/ui/use-toast";
import { formatRelativeDate } from "@/lib/utils";
import { formatCents } from "@/lib/domain/splits";
import type { RequestDraft, Contact, Purchase, Category } from "@prisma/client";

type DraftWithRelations = RequestDraft & {
  contact: Contact;
  purchase: (Purchase & { category: Category | null }) | null;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "outline"; icon: typeof Clock }> = {
  DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
  SENT: { label: "Sent", variant: "warning", icon: Send },
  SETTLED: { label: "Settled", variant: "success", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", variant: "outline", icon: Clock },
};

export function RequestsClient({ drafts }: { drafts: DraftWithRelations[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  const active = drafts.filter((d) => d.status !== "CANCELLED");

  async function handleCopy(draft: DraftWithRelations) {
    const venmoUrl = draft.contact.venmoHandle
      ? `https://venmo.com/${draft.contact.venmoHandle.replace("@", "")}?txn=charge&amount=${(draft.amount / 100).toFixed(2)}&note=${encodeURIComponent(draft.message)}`
      : null;
    const text = venmoUrl
      ? `${draft.message}\n\n${venmoUrl}`
      : `${draft.contact.name}: ${formatCents(draft.amount)}\n${draft.message}`;
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: venmoUrl ? "Venmo link ready to share" : "Request details copied" });
  }

  async function handleSend(draftId: string) {
    await sendDraft(draftId);
    toast({ title: "Marked as sent" });
    router.refresh();
  }

  async function handleSettle(draftId: string) {
    await settleDraft(draftId);
    toast({ title: "Marked as settled!", variant: "default" });
    router.refresh();
  }

  async function handleSaveEdit(draftId: string) {
    await updateDraftMessage(draftId, editMessage);
    setEditingId(null);
    toast({ title: "Message updated" });
    router.refresh();
  }

  return (
    <>
      <AppHeader page="Requests" />

      <div className="px-4 py-4 space-y-4">
        {active.length === 0 ? (
          <EmptyState
            icon="📨"
            title="No requests yet"
            description="Split a purchase and create Venmo request drafts from the Balances screen"
          />
        ) : (
          active.map((draft) => {
            const config = STATUS_CONFIG[draft.status];
            const isEditing = editingId === draft.id;
            return (
              <Card key={draft.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={draft.contact.name} size="md" />
                      <div>
                        <p className="font-semibold text-sm">{draft.contact.name}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeDate(draft.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AmountDisplay cents={draft.amount} size="md" />
                      <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea rows={3} value={editMessage} onChange={(e) => setEditMessage(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(draft.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => { setEditingId(draft.id); setEditMessage(draft.message); }}
                    >
                      {draft.message}
                      <p className="text-[10px] mt-1 text-primary">Tap to edit</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCopy(draft)}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Copy
                    </Button>
                    {draft.status === "DRAFT" && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSend(draft.id)}>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Mark Sent
                      </Button>
                    )}
                    {draft.status !== "SETTLED" && (
                      <Button size="sm" variant="success" className="flex-1" onClick={() => handleSettle(draft.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Settled
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
