import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  Calculator,
  CircleDollarSign,
  Cog,
  DoorOpen,
  Droplets,
  FileSliders,
  Layers,
  Palette,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareStack,
  SwatchBook,
  Users,
  Wrench,
} from "lucide-react";

type SettingsHubProps = {
  isAdmin: boolean;
};

type SettingsItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  show?: boolean;
};

function SettingsCard({ item }: { item: SettingsItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${item.color}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">{item.title}</h3>

            <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-red-600" />
          </div>

          <p className="mt-1 text-sm text-slate-500">{item.description}</p>
        </div>
      </div>
    </Link>
  );
}

function SettingsSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SettingsItem[];
}) {
  const visibleItems = items.filter((item) => item.show !== false);

  if (!visibleItems.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <SettingsCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}

export function SettingsHub({ isAdmin }: SettingsHubProps) {
  const catalogItems: SettingsItem[] = [
    {
      title: "Brands",
      description: "Manage available brands.",
      href: "/settings/brands",
      icon: Building2,
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Products",
      description: "Manage product categories.",
      href: "/settings/products",
      icon: Boxes,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Systems",
      description: "Manage window and door systems.",
      href: "/settings/systems",
      icon: SquareStack,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Configs",
      description: "Manage configurations and layouts.",
      href: "/settings/configs",
      icon: Layers,
      color: "bg-slate-100 text-slate-700",
    },
  ];

  const optionItems: SettingsItem[] = [
    {
      title: "Active Options",
      description: "Manage active panel options.",
      href: "/settings/active-options",
      icon: DoorOpen,
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Preparation Options",
      description: "Manage preparation and bore options.",
      href: "/settings/preparation-options",
      icon: Wrench,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "Sill Options",
      description: "Manage sill options.",
      href: "/settings/sill-options",
      icon: FileSliders,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Reinforcement Options",
      description: "Manage reinforcement options.",
      href: "/settings/reinforcement-options",
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Muntin Patterns",
      description: "Manage muntin pattern options.",
      href: "/settings/muntin-patterns",
      icon: SwatchBook,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Muntin Types",
      description: "Manage muntin type options.",
      href: "/settings/muntin-types",
      icon: Cog,
      color: "bg-slate-100 text-slate-700",
    },
  ];

  const glassItems: SettingsItem[] = [
    {
      title: "Frame Colors",
      description: "Manage frame color options.",
      href: "/settings/framecolors",
      icon: Palette,
      color: "bg-pink-50 text-pink-600",
    },
    {
      title: "Coatings",
      description: "Manage glass coating options.",
      href: "/settings/coatings",
      icon: Sparkles,
      color: "bg-violet-50 text-violet-600",
    },
    {
      title: "Crystals",
      description: "Manage glass crystal options.",
      href: "/settings/crystals",
      icon: Droplets,
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      title: "Tints",
      description: "Manage tint options.",
      href: "/settings/tints",
      icon: Palette,
      color: "bg-sky-50 text-sky-600",
    },
  ];

  const pricingItems: SettingsItem[] = [
    {
      title: "Roles & Markups",
      description: "Manage role markups.",
      href: "/settings/roles",
      icon: CircleDollarSign,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Pricing Rules",
      description: "Manage pricing formulas and rules.",
      href: "/settings/pricing-rules",
      icon: Calculator,
      color: "bg-amber-50 text-amber-600",
    },
    {
      title: "Global Parameters",
      description: "Manage taxes and global values.",
      href: "/settings/global-parameters",
      icon: SlidersHorizontal,
      color: "bg-slate-100 text-slate-700",
    },
    {
      title: "Dimension Policies",
      description: "Manage size and pressure rules.",
      href: "/settings/dimension-policies",
      icon: Ruler,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  const administrationItems: SettingsItem[] = [
    {
      title: "Users",
      description: "Manage system users.",
      href: "/settings/users",
      icon: Users,
      color: "bg-indigo-50 text-indigo-600",
      show: isAdmin,
    },
    {
      title: "Company",
      description: "Manage company branding.",
      href: "/settings/company-branding",
      icon: Building2,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-8 text-white shadow-xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-red-100">
            <Cog className="h-3.5 w-3.5" />
            Settings workspace
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-red-300">
            Authentic Evolution Co
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            System Settings
          </h1>

          <p className="max-w-2xl text-base text-white/70">
            Manage catalogs, options, glass finishes, pricing rules, users, and
            company configuration from one place.
          </p>
        </div>
      </section>

      <SettingsSection
        title="Catalog"
        description="Core product catalog used by estimates and pricing."
        items={catalogItems}
      />

      <SettingsSection
        title="Options"
        description="Door, system, muntin, sill, preparation, and reinforcement options."
        items={optionItems}
      />

      <SettingsSection
        title="Glass & Finishes"
        description="Frame colors, glass, coating, and tint configuration."
        items={glassItems}
      />

      <SettingsSection
        title="Pricing & Rules"
        description="Rules and parameters used by calculations and validation."
        items={pricingItems}
      />

      <SettingsSection
        title="Administration"
        description="User access and company branding."
        items={administrationItems}
      />
    </div>
  );
}
