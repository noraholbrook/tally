"use client";

import { useForm } from "react-hook-form";
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

export function AddContactSheet({ open, onClose, onSuccess }: AddContactSheetProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<{
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
            <Input placeholder="Jordan Lee" {...register("name", { required: true })} />
            {errors.name && <p className="text-xs text-destructive">Name is required</p>}
          </div>
          <div className="space-y-2">
            <Label>Venmo Handle</Label>
            <Input placeholder="@jordanlee" {...register("venmoHandle")} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="jordan@example.com" {...register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input type="tel" placeholder="555-0100" {...register("phone")} />
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
