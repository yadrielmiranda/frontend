"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CardLogin } from "@/components/card-login";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  ClipboardCheck,
  FileText,
  Loader2,
  Ruler,
  Settings,
  ShoppingBag,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  canAccessSettings,
  isAdminRole,
  isClientRole,
  isDealerRole,
  isOperatorRole,
} from "@/lib/rbac";
import { getEstimates } from "@/app/api/estimates.api";
import { getOrders } from "@/app/api/orders.api";
import type { EstimateWithRelations, OrderWithRelations } from "@/lib/types";
import { formatMoney } from "@/lib/formatters";

function getEstimateStatusName(estimate: EstimateWithRelations) {
  if (estimate.status?.name) return estimate.status.name;
  if (estimate.order) return "Ordered";
  return "Unknown";
}

function isActiveEstimate(estimate: EstimateWithRelations) {
  return getEstimateStatusName(estimate).trim().toLowerCase() === "active";
}

function isSignedOrOrderedEstimate(estimate: EstimateWithRelations) {
  const status = getEstimateStatusName(estimate).trim().toLowerCase();

  return (
    status === "ordered" ||
    status === "signed" ||
    status === "approved" ||
    Boolean(estimate.order)
  );
}

function isPendingReviewOrder(order: OrderWithRelations) {
  const status = order.status?.name?.trim().toLowerCase() ?? "";

  return !order.poNumber && status !== "delivered";
}

function toMoneyNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [estimates, setEstimates] = useState<EstimateWithRelations[]>([]);
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setEstimates([]);
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function loadDashboardData() {
      setIsDashboardLoading(true);

      try {
        const [estimatesData, ordersData] = await Promise.all([
          getEstimates(),
          getOrders(),
        ]);

        if (cancelled) return;

        setEstimates(estimatesData);
        setOrders(ordersData);
      } catch (error) {
        console.error("Error loading dashboard data:", error);

        if (!cancelled) {
          setEstimates([]);
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setIsDashboardLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const dashboardSummary = useMemo(() => {
    const activeEstimates = estimates.filter(isActiveEstimate);

    const activeOrSignedEstimates = estimates.filter(
      (estimate) =>
        isActiveEstimate(estimate) || isSignedOrOrderedEstimate(estimate),
    );

    const estimatesValue = activeOrSignedEstimates.reduce((total, estimate) => {
      return total + toMoneyNumber(estimate.customerTotalPayable);
    }, 0);

    const pendingReview = orders.filter(isPendingReviewOrder).length;

    return {
      activeEstimatesCount: activeEstimates.length,
      ordersCount: orders.length,
      pendingReviewCount: pendingReview,
      estimatesValue,
    };
  }, [estimates, orders]);

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
    const role = user?.role?.name;
    const isAdmin = isAdminRole(role);
    const isOperator = isOperatorRole(role);
    const isDealer = isDealerRole(role);
    const isClient = isClientRole(role);
    const canSeeSettings = canAccessSettings(role);

    const displayName =
      user?.firstName ||
      user?.username ||
      user?.email?.split("@")[0] ||
      "there";

    const metricCards = [
      {
        title: isClient ? "My Estimates" : "Active Estimates",
        value: isDashboardLoading
          ? "..."
          : String(dashboardSummary.activeEstimatesCount),
        description: "Ready to manage",
        icon: FileText,
        accent: "border-l-red-500",
        iconBg: "bg-red-50 text-red-600",
        show: true,
      },
      {
        title: isClient ? "My Orders" : "Orders",
        value: isDashboardLoading
          ? "..."
          : String(dashboardSummary.ordersCount),
        description: "No pending orders",
        icon: ShoppingBag,
        accent: "border-l-emerald-500",
        iconBg: "bg-emerald-50 text-emerald-600",
        show: true,
      },
      {
        title: "Pending Review",
        value: isDashboardLoading
          ? "..."
          : String(dashboardSummary.pendingReviewCount),
        description: "Awaiting confirmation",
        icon: ClipboardCheck,
        accent: "border-l-orange-500",
        iconBg: "bg-orange-50 text-orange-600",
        show: true,
      },
      {
        title: "Estimates Value",
        value: isDashboardLoading
          ? "..."
          : formatMoney(dashboardSummary.estimatesValue),
        description: "Active + signed estimates",
        icon: BadgeDollarSign,
        accent: "border-l-slate-700",
        iconBg: "bg-slate-100 text-slate-700",
        show: !isClient,
      },
    ].filter((card) => card.show);

    const quickActions = [
      {
        title: isClient ? "View My Estimates" : "Estimates",
        description: isClient
          ? "Review your available estimates"
          : "Create and manage quotes",
        href: "/estimates",
        icon: FileText,
        show: true,
        color: "bg-red-50 text-red-600",
      },
      {
        title: "Orders",
        description: isClient ? "Track your orders" : "View and manage orders",
        href: "/orders",
        icon: ShoppingBag,
        show: true,
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "My Branding",
        description: "Manage your dealer branding",
        href: "/profile/branding",
        icon: Building2,
        show: isDealer,
        color: "bg-blue-50 text-blue-600",
      },
      {
        title: "Profile",
        description: "Update your account information",
        href: "/profile",
        icon: UserRound,
        show: true,
        color: "bg-slate-100 text-slate-700",
      },
      {
        title: "Pricing Rules",
        description: "Manage pricing configuration",
        href: "/settings/pricing-rules",
        icon: BadgeDollarSign,
        show: canSeeSettings,
        color: "bg-amber-50 text-amber-600",
      },
      {
        title: "Dimension Policies",
        description: "Review size and pressure rules",
        href: "/settings/dimension-policies",
        icon: Ruler,
        show: canSeeSettings,
        color: "bg-purple-50 text-purple-600",
      },
      {
        title: "Users",
        description: "Manage system users",
        href: "/settings/users",
        icon: Users,
        show: isAdmin,
        color: "bg-indigo-50 text-indigo-600",
      },
      {
        title: "System Settings",
        description: isOperator
          ? "Review system configuration"
          : "Manage products, systems, and options",
        href: "/settings",
        icon: Settings,
        show: canSeeSettings,
        color: "bg-slate-100 text-slate-700",
      },
    ].filter((item) => item.show);

    const workspaceDescription = isClient
      ? "Review your estimates, track orders, and manage your account information."
      : isDealer
        ? "Manage estimates, orders, customer quotes, and your dealer branding."
        : "Manage estimates, orders, customer access, pricing rules, and system tools.";

    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white shadow-xl">
          <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_0.6fr] md:items-center lg:p-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-red-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                {role ? `${role} workspace` : "workspace"}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
                  Authentic Evolution Co
                </p>

                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                  Welcome back, {displayName}!
                </h1>

                <p className="max-w-2xl text-base text-white/70">
                  {workspaceDescription}
                </p>
              </div>

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

                {canSeeSettings && (
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  >
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="hidden justify-end md:flex">
              <div className="relative h-36 w-36 lg:h-44 lg:w-44">
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

        <section
          className={
            isClient
              ? "grid gap-4 md:grid-cols-3"
              : "grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          }
        >
          {metricCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.accent} border-l-4`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                      {card.title}
                    </p>

                    <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                      {card.value}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {card.description}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 ${card.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Quick Actions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Shortcuts based on your role and permissions.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-3 ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">
                          {action.title}
                        </h3>

                        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-red-600" />
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
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
