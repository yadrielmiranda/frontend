import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CardRegister } from "@/components/card-register";

export default async function Register({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const params = await searchParams;
  const referralCode = typeof params.ref === "string" ? params.ref : undefined;
  return (
    <AuthPageShell
      title="Client Access"
      description="Create your client account to access estimates and project details."
      contentMaxWidth="max-w-2xl"
    >
      <CardRegister referralCode={referralCode} />
    </AuthPageShell>
  );
}
