"use client";

import { useForm, Controller } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createContact } from "@/lib/actions/contacts";
import { useToast } from "@/components/ui/use-toast";

interface AddContactSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function AddContactSheet({ open, onClose, onSuccess }: AddContactSheetProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } = useForm<{
    name: string; email: string; phone: string; venmoHandle: string;
  }>();

  async function onSubmit(values: { name: string; email: string; phone: string; venmoHandle: string }) {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => v && fd.append(k, v));
    const result = await createContact(fd);
    if ("error" in result) {
      toast({ title: "Error saving contact", variant: "destructive" });
      return;
    }
    toast({ title: "Contact added!", description: values.name });
    reset();
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input placeholder="Jordan Lee" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Venmo Handle</Label>
            <Input placeholder="@jordanlee" {...register("venmoHandle")} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Controller
              name="phone"
              control={control}
              rules={{
                validate: (v) => !v || v.replace(/\D/g, "").length === 10 || "Enter a 10-digit phone number",
              }}
              render={({ field }) => (
                <Input
                  type="tel"
                  placeholder="(XXX) XXX-XXXX"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              )}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="jordan@example.com" {...register("email")} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Add Contact"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
