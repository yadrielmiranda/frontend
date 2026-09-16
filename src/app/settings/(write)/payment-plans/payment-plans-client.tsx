"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePaymentPlan } from "@/app/api/payment-plans.api";
import type {
  PaymentPlan,
  PaymentPlanDefinition,
  PaymentPlanStep,
} from "@/lib/payment-plan";

const emptyPlan: PaymentPlanDefinition = {
  withInstallation: [
    { milestone: "ORDER", basis: "PROJECT", percent: 50 },
    { milestone: "RELEASE", basis: "PROJECT", percent: 40 },
    { milestone: "COMPLETE", basis: "PROJECT", percent: 10 },
  ],
  withoutInstallation: [
    { milestone: "ORDER", basis: "MATERIAL", percent: 50 },
    { milestone: "RELEASE", basis: "MATERIAL", percent: 50 },
  ],
};
const labels = {
  ORDER: "Place order",
  RELEASE: "Release materials",
  INSTALL: "Before installation",
  COMPLETE: "After installation",
};

export function PaymentPlansClient({
  initialPlans,
}: {
  initialPlans: PaymentPlan[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [editing, setEditing] = useState<number | null | undefined>();
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState(emptyPlan);
  const [busy, setBusy] = useState(false);
  const open = (plan?: PaymentPlan) => {
    setEditing(plan?.id ?? null);
    setName(plan?.name ?? "");
    setDefinition(structuredClone(plan?.definition ?? emptyPlan));
  };
  const persist = async (plan: Omit<PaymentPlan, "id">, id?: number) => {
    setBusy(true);
    try {
      const result = await savePaymentPlan(plan, id);
      setPlans((current) =>
        current.some((p) => p.id === result.id)
          ? current.map((p) => (p.id === result.id ? result : p))
          : [...current, result],
      );
      setEditing(undefined);
      toast.success(
        "Payment plan saved. Existing estimates keep their agreed plan.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const change = (
    variant: keyof PaymentPlanDefinition,
    index: number,
    value: Partial<PaymentPlanStep>,
  ) =>
    setDefinition((current) => ({
      ...current,
      [variant]: current[variant].map((row, i) =>
        i === index ? { ...row, ...value } : row,
      ),
    }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a default in{" "}
            <Link className="underline" href="/settings/roles">
              Roles
            </Link>{" "}
            or an override in{" "}
            <Link className="underline" href="/settings/users">
              Users
            </Link>
            . Assignments apply to new estimates.
          </p>
        </div>
        <Button disabled={busy} onClick={() => open()}>
          New payment plan
        </Button>
      </div>
      {editing !== undefined && (
        <form
          className="space-y-5 rounded-xl border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void persist(
              { name, definition, isActive: true },
              editing ?? undefined,
            );
          }}
        >
          <label className="block space-y-2">
            <span className="font-medium">Plan name</span>
            <Input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {(["withInstallation", "withoutInstallation"] as const).map(
            (variant) => (
              <fieldset
                key={variant}
                className="space-y-3 rounded-lg border p-4"
                disabled={busy}
              >
                <legend className="px-2 font-semibold">
                  {variant === "withInstallation"
                    ? "With installation"
                    : "Materials only"}
                </legend>
                <p className="text-xs text-muted-foreground">
                  Use project percentages, or total 100% separately for each
                  base. Material percentages must be paid by release.
                </p>
                {definition[variant].map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_130px_auto]"
                  >
                    <label className="text-sm">
                      Milestone
                      <select
                        aria-label={`Milestone ${index + 1} ${variant}`}
                        className="mt-1 h-10 w-full rounded-md border px-2"
                        value={row.milestone}
                        onChange={(event) =>
                          change(variant, index, {
                            milestone: event.target
                              .value as PaymentPlanStep["milestone"],
                          })
                        }
                      >
                        {Object.entries(labels)
                          .filter(
                            ([key]) =>
                              variant === "withInstallation" ||
                              ["ORDER", "RELEASE"].includes(key),
                          )
                          .map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Calculate from
                      <select
                        aria-label={`Basis ${index + 1} ${variant}`}
                        className="mt-1 h-10 w-full rounded-md border px-2"
                        value={row.basis}
                        onChange={(event) =>
                          change(variant, index, {
                            basis: event.target
                              .value as PaymentPlanStep["basis"],
                          })
                        }
                      >
                        {(variant === "withInstallation"
                          ? ["PROJECT", "MATERIAL", "INSTALLATION"]
                          : ["MATERIAL"]
                        ).map((basis) => (
                          <option key={basis} value={basis}>
                            {basis === "PROJECT"
                              ? "Project total"
                              : basis === "MATERIAL"
                                ? "Materials"
                                : "Installation"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      Percentage
                      <Input
                        aria-label={`Percentage ${index + 1} ${variant}`}
                        type="number"
                        required
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={row.percent}
                        onChange={(event) =>
                          change(variant, index, {
                            percent: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={definition[variant].length <= 1}
                      onClick={() =>
                        setDefinition((current) => ({
                          ...current,
                          [variant]: current[variant].filter(
                            (_, i) => i !== index,
                          ),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={definition[variant].length >= 8}
                  onClick={() =>
                    setDefinition((current) => ({
                      ...current,
                      [variant]: [
                        ...current[variant],
                        {
                          milestone: "RELEASE",
                          basis:
                            variant === "withInstallation"
                              ? "PROJECT"
                              : "MATERIAL",
                          percent: 10,
                        },
                      ],
                    }))
                  }
                >
                  Add installment
                </Button>
              </fieldset>
            ),
          )}
          <p className="text-sm text-muted-foreground">
            Project plans include materials, installation, permit and City Fee.
            Separate plans add permit and City Fee to the first installment. A
            permit payment collected beforehand and the installation deposit are
            credited once toward that installment.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </Button>
            <Button disabled={busy}>{busy ? "Saving…" : "Save plan"}</Button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5"
          >
            <div>
              <h2 className="font-semibold">
                {plan.name}
                {!plan.isActive && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Archived
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.definition.withInstallation
                  .map(
                    (row) =>
                      `${row.percent}% ${row.basis.toLowerCase()} · ${labels[row.milestone]}`,
                  )
                  .join(" / ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => open(plan)}
              >
                Edit
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  void persist({ ...plan, isActive: !plan.isActive }, plan.id)
                }
              >
                {plan.isActive ? "Archive" : "Restore"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
