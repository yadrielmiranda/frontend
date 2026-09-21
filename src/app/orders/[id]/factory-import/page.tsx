import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getFactoryImport } from "@/app/api/factory-import.api";
import { isApiError } from "@/app/api/_base";
import { FactoryImportClient } from "./factory-import-client";

export default async function FactoryImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role?.name !== "admin") notFound();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const initial = await getFactoryImport(id).catch((error) => {
    if (isApiError(error) && [403, 404].includes(error.status)) notFound();
    throw error;
  });
  return <FactoryImportClient initial={initial} />;
}
