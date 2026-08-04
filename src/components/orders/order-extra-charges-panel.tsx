"use client";

import { useState } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrderExtraCharge, OrderWithRelations } from "@/lib/types";
import {
  createOrderExtraCharge,
  respondOrderExtraCharge,
} from "@/app/api/orders.api";
import { createCheckoutSession } from "@/app/api/payments.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import { titleCase } from "@/lib/installation-flow";

type DraftLine = {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxable: boolean;
};

const emptyLine = (id: number): DraftLine => ({
  id,
  description: "",
  quantity: "1",
  unitPrice: "",
  taxable: false,
});

export function OrderExtraChargesPanel({
  order,
  isOwner,
  isPrivileged,
}: {
  order: OrderWithRelations;
  isOwner: boolean;
  isPrivileged: boolean;
}) {
  const [charges, setCharges] = useState(order.extraCharges ?? []);
  const [showForm, setShowForm] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(1)]);
  const [nextLineId, setNextLineId] = useState(2);
  const [notes, setNotes] = useState("");
  const [comments, setComments] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const replaceCharge = (updated: OrderExtraCharge) => {
    setCharges((current) =>
      current.map((charge) => (charge.id === updated.id ? updated : charge)),
    );
  };

  const createCharge = async () => {
    const payload = lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxable: line.taxable,
    }));
    if (
      payload.some(
        (line) =>
          !line.description ||
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isFinite(line.unitPrice) ||
          line.unitPrice <= 0,
      )
    ) {
      toast.error("Complete every extra-charge line with valid values.");
      return;
    }

    setBusy(true);
    try {
      const created = await createOrderExtraCharge(order.id, {
        lines: payload,
        notes: notes.trim() || undefined,
      });
      setCharges((current) => [...current, created]);
      setLines([emptyLine(1)]);
      setNextLineId(2);
      setNotes("");
      setShowForm(false);
      toast.success("Extra charge sent for customer approval.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const respond = async (
    charge: OrderExtraCharge,
    decision: "APPROVE" | "REJECT",
  ) => {
    setBusy(true);
    try {
      replaceCharge(
        await respondOrderExtraCharge(
          charge.id,
          decision,
          comments[charge.id]?.trim() || undefined,
        ),
      );
      toast.success(
        decision === "APPROVE"
          ? "Extra charge approved."
          : "Extra charge rejected.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pay = async (charge: OrderExtraCharge) => {
    setBusy(true);
    try {
      const { url } = await createCheckoutSession(
        order.idEst,
        "EXTRA",
        charge.sequence,
      );
      window.location.href = url;
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  };

  const canCreate =
    isPrivileged &&
    ["Delivered", "Installation in progress", "Installed"].includes(
      order.status.name,
    );

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Extra charges</h2>
          <p className="text-sm text-muted-foreground">
            Each group is approved and paid separately. Paid groups never
            change.
          </p>
        </div>
        {canCreate && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add charge
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {charges.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No extra charges.</p>
        )}

        {charges.map((charge) => (
          <div key={charge.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-3">
              <strong>Extra charge #{charge.sequence}</strong>
              <Badge
                variant={charge.status === "PAID" ? "default" : "secondary"}
              >
                {titleCase(charge.status)}
              </Badge>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {charge.lines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3">
                  <span>
                    {line.description} · {Number(line.quantity)} ×{" "}
                    {formatMoney(Number(line.unitPrice))}
                    {line.taxable ? " · taxable" : ""}
                  </span>
                  <span>{formatMoney(Number(line.subtotal))}</span>
                </div>
              ))}
              {Number(charge.taxAmount) > 0 && (
                <div className="flex justify-between border-t pt-2 text-muted-foreground">
                  <span>Tax</span>
                  <span>{formatMoney(Number(charge.taxAmount))}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{formatMoney(Number(charge.total))}</span>
              </div>
              {charge.notes && (
                <p className="text-muted-foreground">{charge.notes}</p>
              )}
            </div>

            {isOwner && charge.status === "PENDING_CUSTOMER_APPROVAL" && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <Textarea
                  value={comments[charge.id] ?? ""}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [charge.id]: event.target.value,
                    }))
                  }
                  placeholder="Optional comment"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => respond(charge, "REJECT")}
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => respond(charge, "APPROVE")}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {isOwner && charge.status === "PAYMENT_DUE" && (
              <Button
                className="mt-4 w-full"
                disabled={busy}
                onClick={() => pay(charge)}
              >
                <CreditCard className="mr-2 h-4 w-4" /> Pay extra charge ·{" "}
                {formatMoney(Number(charge.total))}
              </Button>
            )}
          </div>
        ))}

        {showForm && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid gap-2 md:grid-cols-[1fr_100px_130px_auto_auto]"
              >
                <Input
                  value={line.description}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, description: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Description"
                />
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Qty"
                />
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id
                          ? { ...item, unitPrice: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Unit price"
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={line.taxable}
                    onCheckedChange={(checked) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id
                            ? { ...item, taxable: Boolean(checked) }
                            : item,
                        ),
                      )
                    }
                  />{" "}
                  Taxable
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.id !== line.id),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLines((current) => [...current, emptyLine(nextLineId)]);
                setNextLineId((value) => value + 1);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add line
            </Button>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button disabled={busy} onClick={createCharge}>
                Send for approval
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
