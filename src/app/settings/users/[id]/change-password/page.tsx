import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/app/api/users.api";
import { AdminChangePasswordForm } from "@/components/admin-change-password-form";

// ✅ CORRECCIÓN: Se ajusta la firma para manejar 'params' como una promesa.
export default async function AdminChangePasswordPage({ params }: { params: Promise<{ id: string }> }) {
  // Se espera la promesa para obtener el id.
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const user = await getUser(userId, token);
  if (!user) {
    notFound();
  }

  return (
    <div className="flex justify-center items-center py-10 px-4">
      <AdminChangePasswordForm user={user} />
    </div>
  );
}
