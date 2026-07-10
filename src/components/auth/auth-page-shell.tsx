import Image from "next/image";
import type { ReactNode } from "react";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  contentMaxWidth?: "max-w-md" | "max-w-lg" | "max-w-2xl";
};

export function AuthPageShell({
  title,
  description,
  children,
  contentMaxWidth = "max-w-md",
}: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] px-4 py-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,1))]" />

      <div className="absolute inset-0 opacity-[0.10]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_680px] lg:gap-14">
          <section className="flex flex-col items-center text-center lg:items-center lg:text-center">
            <div className="relative h-44 w-full max-w-sm sm:h-56 lg:h-[330px] lg:max-w-lg">
              <Image
                src="/branding/authentic-login-logo.png"
                alt="Authentic Evolution Co"
                fill
                priority
                className="object-contain drop-shadow-[0_22px_55px_rgba(220,38,38,0.35)]"
              />
            </div>

            <div className="mt-2 lg:mt-4">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {title}
              </h1>

              <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-red-600" />

              <p className="mt-4 max-w-md text-sm text-white/55 sm:text-base">
                {description}
              </p>
            </div>
          </section>

          <section className={`mx-auto w-full ${contentMaxWidth}`}>
            {children}

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
