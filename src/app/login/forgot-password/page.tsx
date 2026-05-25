import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Password Recovery"
      description="Recover access to your quoting workspace."
      contentMaxWidth="max-w-2xl"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
