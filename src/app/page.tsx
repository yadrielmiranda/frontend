"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CardLogin } from "@/components/card-login";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Settings, Users } from "lucide-react";

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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] px-4 py-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,1))]" />

      <div className="absolute inset-0 opacity-[0.16]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_440px] lg:gap-14">
          <section className="flex flex-col items-center text-center lg:items-center lg:text-center">
            <div className="relative h-44 w-full max-w-sm sm:h-56 lg:h-[330px] lg:max-w-lg">
              <Image
                src="/branding/authentic-login-logo.jpeg"
                alt="Authentic Evolution Co"
                fill
                priority
                className="object-contain drop-shadow-[0_22px_55px_rgba(220,38,38,0.35)]"
              />
            </div>

            <div className="mt-2 lg:mt-4">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Welcome
              </h1>

              <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-red-600 lg:mx-0" />

              <p className="mt-4 max-w-md text-sm text-white/55 sm:text-base">
                Smart quoting for dealers and clients.
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <CardLogin appearance="dark" />

            <p className="mt-5 text-center text-xs text-white/35">
              © {new Date().getFullYear()} Authentic Evolution Co. All rights
              reserved.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
