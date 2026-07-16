"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  LogIn,
  LogOut,
  User,
  UserCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { logoutUser } from "@/app/api/auth/me/auth.api";
import { isDealerRole } from "@/lib/rbac";

const clearStoredDataTableFilters = () => {
  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);

      if (key?.startsWith("data-table:")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      window.sessionStorage.removeItem(key);
    });
  } catch {
    // El logout continúa aunque sessionStorage no esté disponible.
  }
};

export function UserDropdown() {
  const { isAuthenticated, user, isLoading, revalidate } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!user) return "Sign in";

    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

    return fullName || user.username || user.email || "Account";
  }, [user]);

  const triggerName = useMemo(() => {
    if (!user) return "Sign in";
    return user.username || user.firstName || "Account";
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return "U";

    const first = user.firstName?.trim()?.[0];
    const last = user.lastName?.trim()?.[0];

    if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();

    return (user.username?.[0] || user.email?.[0] || "U").toUpperCase();
  }, [user]);

  const roleName = user?.role?.name;

  const handleLogout = async () => {
    try {
      window.dispatchEvent(new Event("auth:manual-logout"));

      await logoutUser();

      clearStoredDataTableFilters();

      await revalidate();

      setIsDropdownOpen(false);
      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleOpenLogin = () => {
    setIsDropdownOpen(false);
    openLoginDialog("manual");
  };

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        disabled
        className="text-white/70 hover:bg-white/10 hover:text-white"
      >
        <User className="h-4 w-4 animate-spin" />
        <span className="ml-1">Loading...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            isAuthenticated
              ? "h-10 gap-2 rounded-full px-2 pr-3 text-white/85 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white"
              : "h-10 gap-2 rounded-full px-3 text-white/85 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white"
          }
        >
          {isAuthenticated && user ? (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-sm ring-1 ring-white/15">
                {initials}
              </span>

              <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">
                {triggerName}
              </span>

              <ChevronDown className="hidden h-4 w-4 text-white/60 sm:block" />
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              <span className="hidden text-sm font-semibold sm:inline">
                Sign in
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-72 rounded-2xl border-slate-200 p-2 shadow-xl"
        align="end"
        forceMount
      >
        {isAuthenticated && user ? (
          <>
            <DropdownMenuLabel className="p-3 font-normal">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-sm font-bold text-white shadow-sm">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {displayName}
                  </p>

                  {user.email && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  )}

                  {roleName && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                      <BadgeCheck className="h-3 w-3 text-red-600" />
                      {roleName}
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg"
              onClick={() => {
                setIsDropdownOpen(false);
                router.push("/profile");
              }}
            >
              <UserCircle className="h-4 w-4 text-slate-500" />
              Profile
            </DropdownMenuItem>

            {isDealerRole(roleName) && (
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-lg"
                onClick={() => {
                  setIsDropdownOpen(false);
                  router.push("/profile/branding");
                }}
              >
                <Building2 className="h-4 w-4 text-slate-500" />
                My Branding
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className="p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">Account</p>
                <p className="text-xs font-normal text-muted-foreground">
                  Sign in to access your workspace.
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg"
              onSelect={(e) => {
                e.preventDefault();
                handleOpenLogin();
              }}
            >
              <LogIn className="h-4 w-4 text-slate-500" />
              Sign in
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
