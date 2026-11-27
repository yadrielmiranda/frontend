import { portalLanguagePreference } from "@/lib/public-language-server";

export async function GET(request: Request) {
  const hints = new URL(request.url).searchParams.getAll("lang");
  const hint = hints.length === 1 ? hints[0] : undefined;
  return Response.json(await portalLanguagePreference(hint), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
