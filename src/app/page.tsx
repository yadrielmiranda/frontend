"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CardLogin } from "@/components/card-login";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Settings, Users } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-[#050505] text-white">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          Loading...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-8 text-white shadow-xl">
          <div className="grid gap-8 md:grid-cols-[1.4fr_0.6fr] md:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
                Authentic Evolution Co
              </p>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Welcome{user?.username ? `, ${user.username}` : ""}!
              </h1>

              <p className="max-w-2xl text-base text-white/70">
                Manage estimates, customers, pricing rules, and production
                details from one place.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  asChild
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Link href="/estimates">
                    <FileText className="mr-2 h-4 w-4" />
                    Go to Estimates
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden justify-end md:flex">
              <div className="relative h-44 w-44">
                <Image
                  src="/branding/authentic-login-logo.jpeg"
                  alt="Authentic Evolution"
                  fill
                  priority
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <FileText className="mb-3 h-5 w-5 text-red-600" />
            <h2 className="font-semibold">Estimates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage quotes for dealers and clients.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users className="mb-3 h-5 w-5 text-red-600" />
            <h2 className="font-semibold">Customers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep customer information organized inside each estimate.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Settings className="mb-3 h-5 w-5 text-red-600" />
            <h2 className="font-semibold">Pricing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use configured rules, options, and markups automatically.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AuthPageShell
      title="Welcome"
      description="Professional quoting for impact windows and doors."
      contentMaxWidth="max-w-md"
    >
      <CardLogin appearance="dark" />
    </AuthPageShell>
  );
}
