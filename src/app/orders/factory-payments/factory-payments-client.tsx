"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFactoryPaymentOrders } from "@/app/api/factory-payments.api";
import { factoryDate, factoryMoney, factoryPaymentStatusLabels, type FactoryManufacturer, type FactoryPaymentFilters, type FactoryPaymentList, type FactoryPaymentOrder } from "@/lib/factory-payments";
import { ManufacturersDialog } from "./manufacturers-dialog";
import { PaymentDetailDialog } from "./payment-detail-dialog";

export function FactoryPaymentStatusBadge({ order }: { order: FactoryPaymentOrder }) {
  const color = order.status === "PAID" ? "bg-emerald-50 text-emerald-800"
    : order.status === "CREDIT" ? "bg-blue-50 text-blue-800"
      : order.status === "PARTIAL" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{factoryPaymentStatusLabels[order.status]}</span>;
}

export function FactoryPaymentsClient({ initialManufacturers, initialOrders }: {
  initialManufacturers: FactoryManufacturer[];
  initialOrders: FactoryPaymentList;
}) {
  const [manufacturers, setManufacturers] = useState(initialManufacturers);
  const [orders, setOrders] = useState(initialOrders);
  const [filters, setFilters] = useState<FactoryPaymentFilters>({ status: "ALL", page: 1, pageSize: 25 });
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    let current = true;
    let repaging = false;
    getFactoryPaymentOrders(filters).then(result => {
      if (!current) return;
      const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
      if ((filters.page ?? 1) > lastPage) {
        repaging = true;
        setFilters(previous => ({ ...previous, page: lastPage }));
        return;
      }
      setOrders(result); setError("");
    }).catch(cause => {
      if (current) setError(cause instanceof Error ? cause.message : "Could not load factory payments.");
    }).finally(() => { if (current && !repaging) setLoading(false); });
    return () => { current = false; };
  }, [filters, refresh]);

  const changeFilter = (changes: Partial<FactoryPaymentFilters>) => {
    setLoading(true); setFilters(current => ({ ...current, ...changes }));
  };
  const reload = () => { setLoading(true); setRefresh(value => value + 1); };
  const page = filters.page ?? 1;
  const pages = Math.max(1, Math.ceil(orders.total / (filters.pageSize ?? 25)));
  const summaries = [
    { title: "Factory total", value: orders.summary.factoryTotal, color: "text-slate-950" },
    { title: "Paid", value: orders.summary.paid, color: "text-emerald-700" },
    { title: "Remaining", value: orders.summary.remaining, color: "text-amber-700" },
    { title: "Credit balance", value: orders.summary.credit, color: "text-blue-700" },
  ];

  return <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-8">
    <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to Orders</Link>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Factory Payments</h1><p className="mt-2 text-sm text-muted-foreground">Track manufacturer payments and outstanding balances for your orders.</p></div>
      <Button variant="outline" onClick={() => setCatalogOpen(true)}><Building2 aria-hidden="true" />Manufacturers</Button>
    </div>
    <section aria-label="Payment totals" className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
      {summaries.map(summary => <div key={summary.title} className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-muted-foreground">{summary.title}</p><p className={`mt-2 text-2xl font-semibold tabular-nums ${summary.color}`}>{factoryMoney(summary.value)}</p></div>)}
    </section>
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <form className="flex min-w-0 flex-1 items-end gap-2 sm:min-w-64" onSubmit={event => { event.preventDefault(); changeFilter({ search: search.trim() || undefined, page: 1 }); }}>
          <label className="flex-1 space-y-1"><span className="text-xs font-medium text-slate-600">Search</span><Input maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="PO, order or project…" /></label>
          <Button variant="outline" type="submit" size="icon" aria-label="Search factory payments"><Search aria-hidden="true" /></Button>
        </form>
        <label className="space-y-1"><span className="block text-xs font-medium text-slate-600">Manufacturer</span><select className="h-9 max-w-64 rounded-md border bg-white px-3 text-sm" value={filters.manufacturerId ?? ""} onChange={event => changeFilter({ manufacturerId: event.target.value ? Number(event.target.value) : undefined, page: 1 })}><option value="">All manufacturers</option>{manufacturers.map(row => <option key={row.id} value={row.id}>{row.name}{!row.active ? " (inactive)" : ""}</option>)}</select></label>
        <label className="space-y-1"><span className="block text-xs font-medium text-slate-600">Payment status</span><select className="h-9 rounded-md border bg-white px-3 text-sm" value={filters.status ?? "ALL"} onChange={event => changeFilter({ status: event.target.value as FactoryPaymentFilters["status"], page: 1 })}><option value="ALL">All orders</option>{Object.entries(factoryPaymentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <Button variant="outline" size="icon" aria-label="Refresh factory payments" disabled={loading} onClick={reload}><RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} /></Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground"><span>Totals reflect the current filters. Orders awaiting PO import have no factory total.</span><span role="status">{loading ? "Loading…" : `${orders.total} ${orders.total === 1 ? "order" : "orders"}`}</span></div>
      {error && <div role="alert" className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error} Showing the previous results until the list can be refreshed.</p><Button size="sm" variant="outline" disabled={loading} onClick={reload}>Try again</Button></div>}
      <div aria-busy={loading} className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-y bg-slate-50"><tr>{["Order / project", "PO", "Manufacturer", "Factory total", "Paid", "Remaining", "Status", ""].map((label, index) => <th key={index} scope="col" className={`whitespace-nowrap px-4 py-3 font-semibold ${index >= 3 && index <= 5 ? "text-right" : ""}`}>{label || <span className="sr-only">Action</span>}</th>)}</tr></thead>
          <tbody>{orders.rows.map(row => <tr key={row.orderId} className="border-b last:border-0 hover:bg-slate-50/60">
            <td className="min-w-40 px-4 py-4"><button type="button" className="font-semibold text-slate-950 hover:underline" onClick={() => setSelectedOrder(row.orderId)}>{row.orderNumber}</button>{row.projectName && <p className="mt-1 max-w-64 truncate text-muted-foreground" title={row.projectName}>{row.projectName}</p>}<p className="mt-1 text-xs text-muted-foreground">{factoryDate(row.orderDate)}</p></td>
            <td className="whitespace-nowrap px-4 py-4 font-medium">{row.poNumber || "—"}</td>
            <td className="min-w-36 px-4 py-4">{row.manufacturer?.name || <span className="text-muted-foreground">Unassigned</span>}</td>
            <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{factoryMoney(row.factoryTotal)}{row.sourceCostChanged && <p className="mt-1 text-xs text-amber-800">Imported total changed</p>}</td>
            <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{factoryMoney(row.paid)}</td>
            <td className={`whitespace-nowrap px-4 py-4 text-right tabular-nums ${row.status === "CREDIT" ? "text-blue-700" : ""}`}>{factoryMoney(row.remaining)}</td>
            <td className="px-4 py-4"><FactoryPaymentStatusBadge order={row} /></td>
            <td className="px-4 py-4 text-right"><Button size="sm" variant="outline" onClick={() => setSelectedOrder(row.orderId)}>View</Button></td>
          </tr>)}</tbody>
        </table>
        {!orders.rows.length && !loading && <p className="p-10 text-center text-sm text-muted-foreground">No orders match these filters.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">Rows per page<select className="rounded-md border bg-white px-2 py-1" value={filters.pageSize ?? 25} onChange={event => changeFilter({ pageSize: Number(event.target.value), page: 1 })}>{[25, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <div className="flex items-center gap-3"><span className="text-muted-foreground">Page {page} of {pages}</span><Button size="icon" variant="outline" aria-label="Previous page" disabled={loading || page <= 1} onClick={() => changeFilter({ page: page - 1 })}><ChevronLeft aria-hidden="true" /></Button><Button size="icon" variant="outline" aria-label="Next page" disabled={loading || page >= pages} onClick={() => changeFilter({ page: page + 1 })}><ChevronRight aria-hidden="true" /></Button></div>
      </div>
    </div>
    <ManufacturersDialog open={catalogOpen} onOpenChange={setCatalogOpen} manufacturers={manufacturers} onSaved={rows => { setManufacturers(rows); reload(); }} />
    {selectedOrder !== null && <PaymentDetailDialog key={selectedOrder} orderId={selectedOrder} manufacturers={manufacturers} onClose={() => setSelectedOrder(null)} onChanged={reload} />}
  </div>;
}
