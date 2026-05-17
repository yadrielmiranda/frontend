import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CardRegister } from "@/components/card-register";

export default function Register() {
  return (
    <AuthPageShell
      title="Client Access"
      description="Create your client account to access estimates and project details."
      contentMaxWidth="max-w-2xl"
    >
      <CardRegister />
    </AuthPageShell>
  );
}