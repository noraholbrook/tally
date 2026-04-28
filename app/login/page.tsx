"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TallyLogo } from "@/components/ui/TallyLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
        return;
      }
      // Auto sign-in after registration
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created! Please sign in.");
        setTab("signin");
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <TallyLogo size="xl" />
          <p className="text-sm text-muted-foreground">Split purchases with friends</p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => { setTab("signin"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "signin" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
          {tab === "signup" && (
            <div className="space-y-1.5">
              <Label>Your Name</Label>
              <Input
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={tab === "signup" ? "At least 8 characters" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={isPending}>
            {isPending ? (tab === "signin" ? "Signing in…" : "Creating account…") : (tab === "signin" ? "Sign In" : "Create Account")}
          </Button>
        </form>
      </div>
    </div>
  );
}
