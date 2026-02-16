"use client";

export function OrderStatusBadge({ name }: { name?: string | null }) {
  const statusName = (name ?? "").trim();

  let colorClasses = "bg-gray-100 text-gray-800";
  
  if (statusName === "Pending") colorClasses = "bg-gray-100 text-gray-800";
  if (statusName === "In production") colorClasses = "bg-yellow-100 text-yellow-800";
  if (statusName === "Delivered") colorClasses = "bg-green-100 text-green-800";
  if (statusName === "Ready to pick up") colorClasses = "bg-blue-100 text-blue-800";

  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${colorClasses}`}>
      {statusName || "—"}
    </span>
  );
}
