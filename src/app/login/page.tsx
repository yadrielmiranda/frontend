import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CardLogin } from "@/components/card-login";

export default function LoginPage() {
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