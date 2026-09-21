"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTechnician, updateTechnician } from "@/app/api/users.api";
import type { User } from "@/lib/types";

export function TechnicianAccountForm({ user }: { user?: User }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const data = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      username: String(form.get("username") ?? "").trim(),
    };
    if ((!user || password) && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError("Use a password with at least 8 characters and at most 72 UTF-8 bytes.");
      return;
    }
    setBusy(true); setError("");
    try {
      if (user) await updateTechnician(user.id, { ...data, ...(password ? { password } : {}) });
      else await createTechnician({ ...data, password });
      toast.success(user ? "Technician account updated." : "Technician account created.");
      router.push("/settings/users"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The account could not be saved."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-6 [--primary:#dc2626] [--primary-foreground:#ffffff] [--ring:#dc2626]">
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="tech-first">First name</Label><Input id="tech-first" name="firstName" required maxLength={100} defaultValue={user?.firstName} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="tech-last">Last name</Label><Input id="tech-last" name="lastName" required maxLength={100} defaultValue={user?.lastName} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="tech-username">Username</Label><Input id="tech-username" name="username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,49}" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" defaultValue={user?.username} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="tech-password">{user ? "New password (optional)" : "Password"}</Label><Input id="tech-password" name="password" type="password" required={!user} minLength={8} maxLength={72} autoComplete="new-password" disabled={busy} /><p className="text-xs text-muted-foreground">{user ? "Leave empty to keep the current password. A change signs out existing sessions." : "At least 8 characters."}</p></div>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" className="min-h-10 rounded-lg px-5 font-semibold hover:bg-red-700" disabled={busy}>{busy ? "Saving…" : user ? "Save technician" : "Create technician"}</Button>
  </form>;
}
