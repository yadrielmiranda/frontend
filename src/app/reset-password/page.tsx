import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthPageShell
      title="Create New Password"
      description="Choose a secure password for your account."
      contentMaxWidth="max-w-2xl"
    >
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  );
}
