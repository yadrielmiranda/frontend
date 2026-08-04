"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { InstallationPriceProfile } from "@/lib/types";
import {
  createInstallationProfile,
  deleteInstallationProfile,
  updateInstallationProfile,
} from "@/app/api/installations.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmationDialog } from "@/components/delete-conf-dialog";

type Draft = {
  name: string;
  adjustmentPercent: string;
  minimumCharge: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: string;
};

const blank = (): Draft => ({
  name: "",
  adjustmentPercent: "0",
  minimumCharge: "0",
  isDefault: false,
  isActive: true,
  sortOrder: "0",
});

const fromProfile = (profile: InstallationPriceProfile): Draft => ({
  name: profile.name,
  adjustmentPercent: String(Number(profile.adjustmentPercent)),
  minimumCharge: String(Number(profile.minimumCharge)),
  isDefault: profile.isDefault,
  isActive: profile.isActive,
  sortOrder: String(profile.sortOrder),
});

const currency = (value: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));

export function InstallationProfilesClient({
  initialProfiles,
  canEdit,
}: {
  initialProfiles: InstallationPriceProfile[];
  canEdit: boolean;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [profileToRemove, setProfileToRemove] =
    useState<InstallationPriceProfile | null>(null);

  const startNew = () => {
    setEditingId("new");
    setDraft(blank());
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Profile name is required.");
    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        adjustmentPercent: Number(draft.adjustmentPercent),
        minimumCharge: Number(draft.minimumCharge),
        isDefault: draft.isDefault,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      const saved =
        editingId === "new"
          ? await createInstallationProfile(payload)
          : await updateInstallationProfile(Number(editingId), payload);
      const refreshed = profiles
        .filter((profile) => profile.id !== saved.id)
        .map((profile) =>
          saved.isDefault ? { ...profile, isDefault: false } : profile,
        );
      setProfiles(
        [...refreshed, saved].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        ),
      );
      setEditingId(null);
      toast.success("Installation profile saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (profile: InstallationPriceProfile) => {
    setBusy(true);
    try {
      const result = await deleteInstallationProfile(profile.id);
      if ("deleted" in result && result.deleted) {
        setProfiles((current) => current.filter((item) => item.id !== profile.id));
      } else {
        setProfiles((current) =>
          current.map((item) =>
            item.id === profile.id ? (result as InstallationPriceProfile) : item,
          ),
        );
      }
      toast.success("Profile updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Installation Price Profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resolution priority is user, then role, then the default profile.
            Positive percentages increase and negative percentages discount.
          </p>
        </div>
        {canEdit && (
          <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> New profile</Button>
        )}
      </div>

      {editingId !== null && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>{editingId === "new" ? "New profile" : "Edit profile"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Adjustment %</Label>
                <Input type="number" step="0.01" min="-99.99" value={draft.adjustmentPercent} onChange={(event) => setDraft((value) => ({ ...value, adjustmentPercent: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Initial minimum</Label>
                <Input type="number" min="0" step="0.01" value={draft.minimumCharge} onChange={(event) => setDraft((value) => ({ ...value, minimumCharge: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={draft.sortOrder} onChange={(event) => setDraft((value) => ({ ...value, sortOrder: event.target.value }))} />
              </div>
              <label className="flex items-center gap-2 pt-7 text-sm">
                <Checkbox checked={draft.isDefault} onCheckedChange={(checked) => setDraft((value) => ({ ...value, isDefault: Boolean(checked) }))} /> Default
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm">
                <Checkbox checked={draft.isActive} onCheckedChange={(checked) => setDraft((value) => ({ ...value, isActive: Boolean(checked) }))} /> Active
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="grid grid-cols-[1fr_120px_140px_150px_120px] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Profile</span><span>Adjustment</span><span>Minimum</span><span>Assignments</span><span />
        </div>
        {profiles.map((profile) => (
          <div key={profile.id} className={`grid grid-cols-[1fr_120px_140px_150px_120px] items-center gap-3 border-b px-4 py-4 text-sm last:border-0 ${!profile.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2 font-medium">
              {profile.name}
              {profile.isDefault && <Badge>Default</Badge>}
              {!profile.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <span>{Number(profile.adjustmentPercent).toFixed(2)}%</span>
            <span>{currency(profile.minimumCharge)}</span>
            <span className="text-muted-foreground">
              {profile._count?.roles ?? 0} roles / {profile._count?.users ?? 0} users
            </span>
            {canEdit && (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => { setEditingId(profile.id); setDraft(fromProfile(profile)); }}>Edit</Button>
                <Button size="icon" variant="ghost" disabled={busy || profile.isDefault} onClick={() => setProfileToRemove(profile)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <DeleteConfirmationDialog
        isOpen={profileToRemove !== null}
        onClose={() => setProfileToRemove(null)}
        onConfirm={() =>
          profileToRemove ? remove(profileToRemove) : Promise.resolve()
        }
        title="Delete or deactivate this profile?"
        description={
          profileToRemove
            ? `“${profileToRemove.name}” will be deleted if unused; otherwise it will be deactivated and preserved for existing records.`
            : undefined
        }
        confirmText="Continue"
      />
    </div>
  );
}
