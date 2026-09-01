export type EstimateStatusBadgeAppearance = {
  label: string;
  className: string;
};

export function getEstimateStatusBadgeAppearance(
  statusName: string | null | undefined,
): EstimateStatusBadgeAppearance {
  const label = statusName?.trim() || "Unknown";
  const normalized = label.toLowerCase();

  if (normalized === "active") {
    return {
      label: "Active",
      className: "bg-green-100 text-green-800",
    };
  }

  if (normalized === "ordered") {
    return {
      label: "Ordered",
      className: "bg-blue-100 text-blue-800",
    };
  }

  if (normalized === "expired") {
    return {
      label: "Expired",
      className: "bg-red-100 text-red-800",
    };
  }

  return {
    label,
    className: "bg-gray-100 text-gray-800",
  };
}
