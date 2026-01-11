import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackLinkProps {
  href: string;
  label: string;
}

/**
 * Link de navegación hacia atrás.
 * Uso recomendado para páginas de detalle / creación.
 */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Button variant="link" asChild className="h-auto px-0">
      <Link
        href={href}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
