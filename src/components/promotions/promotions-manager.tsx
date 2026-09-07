"use client";
import { useState } from "react";
import {
  Promotion,
  PromotionOptions,
  savePromotion,
} from "@/app/api/promotions.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const localDate = (s: string) => {
  const d = new Date(s);
  return new Date(+d - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const empty = () => ({
  name: "",
  percent: "20",
  audience: "ALL",
  roleIds: [] as number[],
  userIds: [] as number[],
  brandId: "",
  productId: "",
  systemId: "",
  startsAt: localDate(new Date().toISOString()),
  endsAt: localDate(new Date(Date.now() + 7 * 86400000).toISOString()),
  enabled: true,
});
// Compara los valores que se guardan, sin considerar el orden de las selecciones.
const formKey = (form: ReturnType<typeof empty>) =>
  JSON.stringify({
    name: form.name.trim(),
    percent: Number(form.percent),
    audience: form.audience,
    roleIds:
      form.audience === "ROLE" ? [...form.roleIds].sort((a, b) => a - b) : [],
    userIds:
      form.audience === "USERS" ? [...form.userIds].sort((a, b) => a - b) : [],
    brandId: form.brandId,
    productId: form.productId,
    systemId: form.systemId,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    enabled: form.enabled,
  });
export function PromotionsManager({
  initial,
  options,
}: {
  initial: Promotion[];
  options: PromotionOptions;
}) {
  const [rows, setRows] = useState(initial),
    [open, setOpen] = useState(false),
    [id, setId] = useState<number>(),
    [form, setForm] = useState(empty),
    [initialFormKey, setInitialFormKey] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [search, setSearch] = useState("");
  const hasChanges = formKey(form) !== initialFormKey;
  const set = (key: string, value: unknown) =>
    setForm((v) => ({ ...v, [key]: value }));
  const edit = (p?: Promotion) => {
    setId(p?.id);
    setError("");
    setSearch("");
    const nextForm = p
      ? {
          ...p,
          percent: String(p.percent),
          roleIds: [...p.roleIds],
          brandId: String(p.brandId ?? ""),
          productId: String(p.productId ?? ""),
          systemId: String(p.systemId ?? ""),
          startsAt: localDate(p.startsAt),
          endsAt: localDate(p.endsAt),
        }
      : empty();
    setForm(nextForm);
    setInitialFormKey(formKey(nextForm));
    setOpen(true);
  };
  const label = (p: Promotion) =>
    [
      options.brands.find((x) => x.id === p.brandId)?.name,
      options.products.find((x) => x.id === p.productId)?.name,
      options.systems.find((x) => x.id === p.systemId)?.name,
    ]
      .filter(Boolean)
      .join(" · ") || "All materials";
  const select = (
    key: "brandId" | "productId" | "systemId",
    title: string,
    items: { id: number; name: string }[],
    all = "All",
  ) => (
    <label className="grid gap-1 text-sm">
      {title}
      <select
        className="h-10 rounded-md border px-3 bg-background"
        value={form[key]}
        onChange={(e) => {
          set(key, e.target.value);
          if (key === "brandId" || key === "productId") set("systemId", "");
        }}
      >
        <option value="">{all}</option>
        {items.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !hasChanges) return;
    if (form.audience === "ROLE" && form.roleIds.length === 0) {
      setError("Select at least one role.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await savePromotion(
        {
          ...form,
          percent: Number(form.percent),
          roleIds: form.audience === "ROLE" ? form.roleIds : [],
          userIds: form.audience === "USERS" ? form.userIds : [],
          brandId: form.brandId ? Number(form.brandId) : undefined,
          productId: form.productId ? Number(form.productId) : undefined,
          systemId: form.systemId ? Number(form.systemId) : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
        },
        id,
      );
      setRows((v) => [saved, ...v.filter((p) => p.id !== saved.id)]);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save promotion.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Promotions</h1>
          <p className="text-muted-foreground">
            Material discounts by audience, brand, product or system.
          </p>
        </div>
        <Button onClick={() => edit()}>New promotion</Button>
      </div>
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {[
                "Promotion",
                "Audience",
                "Materials",
                "Dates",
                "Status",
                "",
              ].map((v, i) => (
                <th key={i} className="text-left p-4">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4 font-medium">
                  {p.name}
                  <div>{Number(p.percent)}% off</div>
                </td>
                <td className="p-4">
                  {p.audience === "ALL"
                    ? "All users"
                    : p.audience === "ROLE"
                      ? p.roleIds
                          .map(
                            (id) =>
                              options.roles.find((r) => r.id === id)?.name ??
                              `Role #${id}`,
                          )
                          .join(", ") || "No roles selected"
                      : `${p.userIds.length} selected users`}
                </td>
                <td className="p-4">{label(p)}</td>
                <td className="p-4">
                  {new Date(p.startsAt).toLocaleString()}
                  <br />
                  {new Date(p.endsAt).toLocaleString()}
                </td>
                <td className="p-4">
                  {!p.enabled
                    ? "Paused"
                    : Date.now() < Date.parse(p.startsAt)
                      ? "Scheduled"
                      : Date.now() >= Date.parse(p.endsAt)
                        ? "Expired"
                        : "Active"}
                </td>
                <td className="p-4">
                  <Button variant="outline" onClick={() => edit(p)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6">No promotions yet.</p>}
      </div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!saving) setOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{id ? "Edit promotion" : "New promotion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1 text-sm">
              Name
              <Input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1 text-sm">
                Discount (%)
                <Input
                  type="number"
                  required
                  min="0.0001"
                  max="100"
                  step="0.0001"
                  value={form.percent}
                  onChange={(e) => set("percent", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Audience
                <select
                  className="border rounded-md px-3 h-10 bg-background"
                  value={form.audience}
                  onChange={(e) => set("audience", e.target.value)}
                >
                  <option value="ALL">All users</option>
                  <option value="ROLE">Selected roles</option>
                  <option value="USERS">Selected users</option>
                </select>
              </label>
            </div>
            {form.audience === "ROLE" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Roles</legend>
                <p className="text-sm text-muted-foreground">
                  Applies to users with any of the selected roles.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {options.roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={form.roleIds.includes(role.id)}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            roleIds:
                              checked === true
                                ? [...new Set([...current.roleIds, role.id])]
                                : current.roleIds.filter(
                                    (id) => id !== role.id,
                                  ),
                          }))
                        }
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {form.audience === "USERS" && (
              <div className="space-y-2">
                <Input
                  placeholder="Find user"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-36 overflow-y-auto border rounded-md p-3">
                  {options.users
                    .filter((u) =>
                      u.username.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((u) => (
                      <label key={u.id} className="flex gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={form.userIds.includes(u.id)}
                          onChange={(e) =>
                            set(
                              "userIds",
                              e.target.checked
                                ? [...form.userIds, u.id]
                                : form.userIds.filter((id) => id !== u.id),
                            )
                          }
                        />
                        {u.username}
                      </label>
                    ))}
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-4">
              {select("brandId", "Brand", options.brands)}
              {select("productId", "Product", options.products)}
              {select(
                "systemId",
                "System",
                options.systems.filter(
                  (s) =>
                    (!form.brandId || s.idBrand === Number(form.brandId)) &&
                    (!form.productId || s.idProduct === Number(form.productId)),
                ),
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {(["startsAt", "endsAt"] as const).map((k, i) => (
                <label className="grid gap-1 text-sm" key={k}>
                  {i ? "Ends" : "Starts"}
                  <Input
                    type="datetime-local"
                    required
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
              />
              Enabled
            </label>
            <p className="text-sm text-muted-foreground">
              Changes apply to new estimates and recalculations. Paid terms are
              preserved. Eligible discounts do not stack.
            </p>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={saving || !hasChanges}>
                {saving ? "Saving…" : "Save promotion"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
