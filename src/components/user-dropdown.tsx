'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/contexts/AuthContext';
import { useLoginDialog } from '@/contexts/LoginDialogContext';
import { logoutUser } from '@/app/api/auth/me/auth.api';

export function UserDropdown() {
  const { isAuthenticated, user, isLoading, revalidate } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const router = useRouter();

  // ✅ Control del dropdown (para cerrarlo al navegar)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      await revalidate();
      setIsDropdownOpen(false);
      router.push('/');
    } catch (error) {
      // ⚠️ Log simple
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" disabled>
        <User className="h-4 w-4 animate-spin" />
        <span className="ml-1">Loading...</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <User className="h-4 w-4" />
          <span className="ml-1">
            {isAuthenticated && user ? user.username : 'Sign in'}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {isAuthenticated && user ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>

                {/* ✅ Badge de rol */}
                {user.role?.name && (
                  <p className="text-xs leading-none text-muted-foreground pt-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {user.role.name}
                    </span>
                  </p>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setIsDropdownOpen(false);
                router.push('/profile');
              }}
            >
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setIsDropdownOpen(false);
                router.push('/settings');
              }}
            >
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                // ✅ Radix: prevenimos cierre automático para controlarlo nosotros
                e.preventDefault();

                // ✅ Cerramos dropdown y abrimos el modal global
                setIsDropdownOpen(false);
                openLoginDialog('manual');
              }}
            >
              Sign in
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
