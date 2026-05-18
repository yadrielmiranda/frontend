import { cn } from "@/lib/utils";

type ContentCardProps = {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export function ContentCard({
  children,
  className,
  padded = true,
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
