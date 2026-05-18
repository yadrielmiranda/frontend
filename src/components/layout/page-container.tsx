import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "wide" | "narrow";
};

export function PageContainer({
  children,
  className,
  size = "default",
}: PageContainerProps) {
  const sizeClass = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  }[size];

  return (
    <div
      className={cn("mx-auto w-full px-4 py-10 sm:px-6", sizeClass, className)}
    >
      {children}
    </div>
  );
}
