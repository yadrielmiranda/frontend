import { BackLink } from "@/components/navigation/back-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FormPageShellProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
};

export function FormPageShell({
  backHref,
  backLabel,
  title,
  description,
  children,
  maxWidth = "max-w-xl",
}: FormPageShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-6xl items-center justify-center px-4 py-10">
      <div className={`w-full ${maxWidth} space-y-4`}>
        {backHref && backLabel && (
          <BackLink href={backHref} label={backLabel} />
        )}

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="text-2xl">{title}</CardTitle>

            {description && (
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
