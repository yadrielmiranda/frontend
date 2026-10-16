"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  InstallationPriceProfile,
  InstallationService,
} from "@/lib/types";
import {
  profileAdjustmentDrafts,
  profileAdjustmentError,
  type ProfileAdjustmentDrafts,
} from "@/lib/installation-profile-pricing";
import { InstallationProfileRatesEditor } from "@/components/installations/installation-profile-rates-editor";
import { InstallationStatusBadge } from "@/components/installations/installation-status-badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Draft = {
  name: string;
  adjustments: ProfileAdjustmentDrafts;
  minimumCharge: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: string;
};

const blank = (): Draft => ({
  name: "",
  adjustments: {},
  minimumCharge: "0",
  isDefault: false,
  isActive: true,
  sortOrder: "0",
});

const fromProfile = (profile: InstallationPriceProfile): Draft => ({
  name: profile.name,
  adjustments: profileAdjustmentDrafts(profile),
  minimumCharge: String(Number(profile.minimumCharge)),
  isDefault: profile.isDefault,
  isActive: profile.isActive,
  sortOrder: String(profile.sortOrder),
});

const currency = (value: string | number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(value),
  );

const filterClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function InstallationProfilesClient({
  initialProfiles,
  services,
  canEdit,
}: {
  initialProfiles: InstallationPriceProfile[];
  services: InstallationService[];
  canEdit: boolean;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [profileToRemove, setProfileToRemove] =
    useState<InstallationPriceProfile | null>(null);
  const busyRef = useRef(false);
  const originalDraft = useRef("");
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter(
        (profile) =>
          (!query || profile.name.toLowerCase().includes(query)) &&
          (statusFilter === "all" ||
            profile.isActive === (statusFilter === "active")),
      )
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
  }, [profiles, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hasFilters = search !== "" || statusFilter !== "all";
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };
  const restoreFocus = () => {
    if (opener.current?.isConnected) opener.current.focus();
    else searchInput.current?.focus();
  };
  const openEditor = (
    profile: InstallationPriceProfile | null,
    trigger: HTMLButtonElement,
  ) => {
    if (!canEdit || busyRef.current) return;
    const nextDraft = profile ? fromProfile(profile) : blank();
    opener.current = trigger;
    originalDraft.current = JSON.stringify(nextDraft);
    setDraft(nextDraft);
    setEditingId(profile?.id ?? "new");
    setDiscardOpen(false);
  };
  const requestClose = () => {
    if (busyRef.current || discardOpen) return;
    if (JSON.stringify(draft) !== originalDraft.current) setDiscardOpen(true);
    else setEditingId(null);
  };

  const save = async () => {
    if (!canEdit || busyRef.current || editingId === null) return;
    if (!draft.name.trim()) return toast.error("Profile name is required.");
    const adjustmentError = profileAdjustmentError(
      draft.adjustments,
      profiles.find((profile) => profile.id === editingId),
    );
    if (adjustmentError) return toast.error(adjustmentError);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(draft.minimumCharge) ||
      !Number.isFinite(Number(draft.minimumCharge))
    ) {
      return toast.error(
        "Enter a valid provider minimum: zero or a positive amount with up to two decimal places.",
      );
    }
    busyRef.current = true;
    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        adjustments: Object.values(draft.adjustments).map(
          ({ serviceId, ruleId, type, value }) => ({
            serviceId,
            ruleId,
            type,
            value: Number(value),
          }),
        ),
        minimumCharge: Number(draft.minimumCharge),
        isDefault: draft.isDefault,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      const saved =
        editingId === "new"
          ? await createInstallationProfile(payload)
          : await updateInstallationProfile(editingId, payload);
      setProfiles((current) => [
        ...current
          .filter((profile) => profile.id !== saved.id)
          .map((profile) =>
            saved.isDefault ? { ...profile, isDefault: false } : profile,
          ),
        saved,
      ]);
      setEditingId(null);
      toast.success("Installation profile saved.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const remove = async () => {
    if (
      !canEdit ||
      busyRef.current ||
      !profileToRemove ||
      profileToRemove.isDefault
    )
      return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await deleteInstallationProfile(profileToRemove.id);
      setProfiles((current) =>
        "deleted" in result && result.deleted
          ? current.filter((profile) => profile.id !== profileToRemove.id)
          : current.map((profile) =>
              profile.id === profileToRemove.id
                ? (result as InstallationPriceProfile)
                : profile,
            ),
      );
      setProfileToRemove(null);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Installation Price Profiles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canEdit
              ? "Manage installation profiles and their service and rule increases."
              : "Browse installation profiles and assignments."}
          </p>
        </div>
        {canEdit && (
          <Button
            disabled={busy}
            onClick={(event) => openEditor(null, event.currentTarget)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New profile
          </Button>
        )}
      </div>

      <section
        aria-label="Find installation profiles"
        className="rounded-xl border bg-white p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_200px]">
          <div className="space-y-1.5">
            <Label htmlFor="installation-profile-search">Search profiles</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInput}
                id="installation-profile-search"
                className="pl-9"
                placeholder="Profile name…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installation-profile-status-filter">Status</Label>
            <select
              id="installation-profile-status-filter"
              className={filterClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex min-h-7 items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {filtered.length} of {profiles.length} profiles
          </p>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Profile</th>
                {canEdit && (
                  <>
                    <th className="hidden px-3 py-3 text-right md:table-cell">
                      Rates adjusted
                    </th>
                    <th className="hidden px-3 py-3 text-right sm:table-cell">
                      Provider minimum
                    </th>
                  </>
                )}
                <th className="hidden px-3 py-3 text-left lg:table-cell">
                  Assignments
                </th>
                <th className="hidden px-3 py-3 text-left sm:table-cell">
                  Status
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((profile) => {
                const adjustedRates = (profile.adjustments ?? []).filter(
                  (adjustment) => Number(adjustment.value) !== 0,
                ).length;
                return (
                  <tr
                    key={profile.id}
                    className="border-b last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="max-w-[360px] px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium break-words">
                          {profile.name}
                        </span>
                        {profile.isDefault && <Badge>Default</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground lg:hidden">
                        {profile._count?.roles ?? 0} roles /{" "}
                        {profile._count?.users ?? 0} users
                      </p>
                      {canEdit && (
                        <p className="mt-1 text-xs text-muted-foreground md:hidden">
                          {adjustedRates} rates adjusted
                          <span className="sm:hidden">
                            {" "}
                            · {currency(profile.minimumCharge)} minimum
                          </span>
                        </p>
                      )}
                      <span className="mt-1 block sm:hidden">
                        <InstallationStatusBadge isActive={profile.isActive} />
                      </span>
                    </td>
                    {canEdit && (
                      <>
                        <td className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
                          {adjustedRates}
                        </td>
                        <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">
                          {currency(profile.minimumCharge)}
                        </td>
                      </>
                    )}
                    <td className="hidden px-3 py-3 text-xs text-muted-foreground lg:table-cell">
                      {profile._count?.roles ?? 0} roles /{" "}
                      {profile._count?.users ?? 0} users
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <InstallationStatusBadge isActive={profile.isActive} />
                    </td>
                    {canEdit && (
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                            aria-label={`Edit ${profile.name}`}
                            disabled={busy}
                            onClick={(event) =>
                              openEditor(profile, event.currentTarget)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                            disabled={busy || profile.isDefault}
                            aria-label={`Delete ${profile.name}`}
                            title={
                              profile.isDefault
                                ? "The default profile cannot be deleted."
                                : `Delete ${profile.name}`
                            }
                            onClick={(event) => {
                              if (busyRef.current) return;
                              opener.current = event.currentTarget;
                              setProfileToRemove(profile);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="font-medium">
              {profiles.length
                ? "No profiles match your filters."
                : "No installation profiles yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {profiles.length
                ? "Try another search or clear the filters."
                : canEdit
                  ? "Create your first profile to set installation pricing."
                  : "Profiles will appear here when they are added."}
            </p>
            {hasFilters && (
              <Button className="mt-3" variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="installation-profile-page-size"
              className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
            >
              Rows per page
            </Label>
            <select
              id="installation-profile-page-size"
              className="h-9 w-auto min-w-24 shrink-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filtered.length
                ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`
                : "0 results"}{" "}
              · Page {currentPage} of {pageCount}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                aria-label="Next page"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={canEdit && editingId !== null}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("profile-name")?.focus();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 text-left sm:px-6 sm:pr-14">
            <DialogTitle>
              {editingId === "new" ? "New profile" : "Edit profile"}
            </DialogTitle>
            <DialogDescription>
              Set the provider minimum and independent increases for each
              service and rule.
            </DialogDescription>
          </DialogHeader>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-3 top-3 h-8 w-8"
            aria-label="Close profile"
            disabled={busy}
            onClick={requestClose}
          >
            <X className="h-4 w-4" />
          </Button>
          {canEdit && editingId !== null && (
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <fieldset disabled={busy} className="min-w-0 space-y-5">
                <section
                  aria-labelledby="profile-details-heading"
                  className="space-y-4"
                >
                  <h2
                    id="profile-details-heading"
                    className="text-sm font-semibold"
                  >
                    Profile details
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="profile-name">Name</Label>
                      <Input
                        id="profile-name"
                        value={draft.name}
                        onChange={(event) =>
                          setDraft((value) => ({
                            ...value,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-minimum">Provider minimum</Label>
                      <Input
                        id="profile-minimum"
                        type="number"
                        min="0"
                        step="0.01"
                        aria-describedby="profile-minimum-description"
                        value={draft.minimumCharge}
                        onChange={(event) =>
                          setDraft((value) => ({
                            ...value,
                            minimumCharge: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-sort-order">Sort order</Label>
                      <Input
                        id="profile-sort-order"
                        type="number"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          setDraft((value) => ({
                            ...value,
                            sortOrder: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="profile-default"
                        checked={draft.isDefault}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          setDraft((value) => ({
                            ...value,
                            isDefault: Boolean(checked),
                          }))
                        }
                      />
                      <Label htmlFor="profile-default">Default</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="profile-active"
                        checked={draft.isActive}
                        disabled={busy}
                        onCheckedChange={(checked) =>
                          setDraft((value) => ({
                            ...value,
                            isActive: Boolean(checked),
                          }))
                        }
                      />
                      <Label htmlFor="profile-active">Active</Label>
                    </div>
                  </div>
                  <p
                    id="profile-minimum-description"
                    className="text-sm text-muted-foreground"
                  >
                    The provider receives at least this minimum. Service and
                    rule increases are added separately, without increasing the
                    minimum adjustment. For example: $300 base, a $500 provider
                    minimum, and $60 in increases result in a $560 installation
                    price.
                  </p>
                </section>
                <InstallationProfileRatesEditor
                  services={services}
                  adjustments={draft.adjustments}
                  disabled={busy}
                  onChange={(adjustments) =>
                    setDraft((current) => ({ ...current, adjustments }))
                  }
                />
              </fieldset>
            </div>
          )}
          <DialogFooter className="shrink-0 border-t bg-white px-5 py-4 sm:px-6">
            <Button variant="outline" disabled={busy} onClick={requestClose}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (editingId !== null)
              document.getElementById("profile-name")?.focus();
            else restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes to this profile have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setDiscardOpen(false);
                setEditingId(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={profileToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !busyRef.current) setProfileToRemove(null);
        }}
      >
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (busyRef.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete or deactivate this profile?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {profileToRemove
                ? `“${profileToRemove.name}” will be deleted if unused; otherwise it will be deactivated and preserved for existing records.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {busy ? "Updating…" : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
