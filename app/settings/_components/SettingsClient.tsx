"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, Database, Info, ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppHeader } from "@/components/layout/AppHeader";
import { ContactAvatar } from "@/components/shared/ContactAvatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import type { User as UserType } from "@prisma/client";

interface SettingsClientProps {
  user: UserType | null;
  stats: { purchases: number; contacts: number; requests: number };
}

export function SettingsClient({ user, stats }: SettingsClientProps) {
  const { toast } = useToast();
  const router = useRouter();

  async function handleReset() {
    if (!confirm("Delete all contacts and purchases? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        toast({ title: "All data cleared" });
        router.refresh();
      }
    } catch {
      toast({ title: "Failed to clear data", variant: "destructive" });
    }
  }

  return (
    <>
      <AppHeader page="Settings" />

      <div className="px-4 py-4 space-y-5">
        {/* Profile */}
        {user && (
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <ContactAvatar name={user.name} size="lg" className="h-16 w-16 text-xl" />
              <div>
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.venmoHandle && <Badge variant="secondary" className="mt-1 text-xs">{user.venmoHandle}</Badge>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold">{stats.purchases}</p><p className="text-xs text-muted-foreground">Purchases</p></div>
              <div><p className="text-2xl font-bold">{stats.contacts}</p><p className="text-xs text-muted-foreground">Contacts</p></div>
              <div><p className="text-2xl font-bold">{stats.requests}</p><p className="text-xs text-muted-foreground">Requests</p></div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" /> About Tally</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3 text-sm text-muted-foreground">
            <p>Tally is a mobile-first purchase splitting app. Track who owes what and settle up easily.</p>
            <Separator />
            <div className="flex justify-between"><span>Version</span><span className="font-medium text-foreground">0.1.0 MVP</span></div>
            <div className="flex justify-between"><span>Stack</span><span className="font-medium text-foreground">Next.js · Prisma · SQLite</span></div>
            <div className="flex justify-between"><span>Auth</span><span className="font-medium text-foreground">Demo mode</span></div>
          </CardContent>
        </Card>

        {/* Demo reset */}
        <Card className="border-destructive/30">
          <CardContent className="p-5">
            <Button variant="outline" className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/5" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Deletes all contacts and purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Button variant="outline" className="w-full h-12" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
