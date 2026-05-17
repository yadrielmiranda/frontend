"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicAuthPage = pathname === "/" || pathname.startsWith("/login");

  const showTopBar = isLoading || isAuthenticated || !isPublicAuthPage;

  return (
    <>
      {showTopBar && <TopBar />}

      <main
        className={
          showTopBar
            ? "w-full px-4 py-6 sm:px-6 lg:px-8"
            : "w-full"
        }
      >
        {children}
      </main>
    </>
  );
}