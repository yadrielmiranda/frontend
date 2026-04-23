"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-4xl font-bold">Welcome to Authentic Evolution+</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="space-y-3">
        <h1 className="text-4xl font-bold">
          Welcome{user?.username ? `, ${user.username}` : ""}!
        </h1>
        <p className="text-muted-foreground">Choose where you want to go.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-4xl font-bold">Welcome to Authentic Evolution+</h1>
      <p className="text-muted-foreground">Sign in to get started.</p>
    </div>
  );
}
