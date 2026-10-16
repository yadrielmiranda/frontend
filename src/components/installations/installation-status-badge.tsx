import { Badge } from "@/components/ui/badge";

export function InstallationStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }
    >
      <span
        aria-hidden="true"
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-amber-600"}`}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
