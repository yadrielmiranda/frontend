"use client";
import type { PaymentPlan } from "@/lib/payment-plan";
// src/app/settings/(write)/roles/columns-roles.tsx


import type { ColumnDef } from "@tanstack/react-table";
import type { InstallationPriceProfile, Role } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { updateRole, updateRoleMarkup } from "@/app/api/roles.api";
import { MARKUP_PERCENT_PATTERN, shiftDecimalString } from "@/lib/markup-decimal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function markupPercent(value: Role["markup"]): string {
  const percentage = shiftDecimalString(String(value), 2);
  const [whole, fraction = ""] = percentage.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

function EditableMarkupCell({ role }: { role: Role }) {
  const router = useRouter();

  const [markup, setMarkup] = useState(markupPercent(role.markup));
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (isLoading) return;
    const percentage = markup.trim();
    if (!MARKUP_PERCENT_PATTERN.test(percentage)) {
      toast.error("Enter a valid markup percentage with up to 16 decimal places.");
      return;
    }
    setIsLoading(true);
    try {
      const updated = await updateRoleMarkup(role.id, shiftDecimalString(percentage, -2));
      setMarkup(markupPercent(updated.markup));
      toast.success(`Markup for '${role.name}' role updated successfully.`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 max-w-[200px]">
      <Input
        type="text"
        inputMode="decimal"
        disabled={isLoading}
        aria-label={`Default markup for ${role.name}`}
        value={markup}
        onChange={(e) => setMarkup(e.target.value)}
        className="w-32"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <span className="text-gray-500">%</span>

      <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        disabled={isLoading}
        className="h-8 w-8"
        aria-label="Save markup"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function InstallationProfileCell({
  role,
  profiles,
}: {
  role: Role;
  profiles: InstallationPriceProfile[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const save = async (value: string) => {
    setSaving(true);
    try {
      await updateRole(role.id, {
        installationPriceProfileId: value === "DEFAULT" ? null : Number(value),
      });
      toast.success(`Installation profile for '${role.name}' updated.`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={role.installationPriceProfileId ? String(role.installationPriceProfileId) : "DEFAULT"}
      onValueChange={save}
      disabled={saving}
    >
      <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="DEFAULT">Use default profile</SelectItem>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PaymentPlanCell({ role, plans }: { role: Role; plans: PaymentPlan[] }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  const save = async (value: string) => {
    setBusy(true);
    try { await updateRole(role.id, { paymentPlanId: value === "DEFAULT" ? null : Number(value) }); router.refresh(); toast.success("Payment plan updated for new estimates."); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  };
  return <Select disabled={busy} value={role.paymentPlanId ? String(role.paymentPlanId) : "DEFAULT"} onValueChange={save}>
    <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger><SelectContent>
      <SelectItem value="DEFAULT">Use default payment plan</SelectItem>
      {plans.filter(plan => plan.isActive || plan.id === role.paymentPlanId).map(plan => <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>)}
    </SelectContent>
  </Select>;
}

export const getColumns = (
  profiles: InstallationPriceProfile[],
  paymentPlans: PaymentPlan[],
): ColumnDef<Role>[] => [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Role Name",
    cell: ({ row }) => (
      <div className="capitalize font-medium">{row.original.name}</div>
    ),
  },
  { id: "paymentPlan", header: "Payment Plan", cell: ({row}) => row.original.name === "technician" ? "Not applicable" : <PaymentPlanCell role={row.original} plans={paymentPlans} /> },
  {
    accessorKey: "markup",
    header: "Default Markup",
    cell: ({ row }) => row.original.name === "technician" ? "Not applicable" : <EditableMarkupCell role={row.original} />,
  },
  {
    id: "installationProfile",
    header: "Installation Profile",
    cell: ({ row }) => row.original.name === "technician" ? "Not applicable" : (
      <InstallationProfileCell role={row.original} profiles={profiles} />
    ),
  },
];
