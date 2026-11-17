import type { MetadataRoute } from "next";
import { COMPANY_PUBLIC_ROUTES } from "@/lib/company-public-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = "https://www.authenticevolutionco.com";
  return COMPANY_PUBLIC_ROUTES.map(path => {
    const english = path.replace(/^\/es\//, "/");
    return {
      url: `${origin}${path}`,
      alternates: { languages: {
        en: `${origin}${english}`,
        es: `${origin}/es${english}`,
        "x-default": `${origin}${english}`,
      } },
    };
  });
}
