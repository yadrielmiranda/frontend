export const COMPANY_PUBLIC_ROUTES = [
  "/company",
  "/es/company",
  "/for-ai",
  "/es/for-ai",
  "/resources",
  "/es/resources",
  "/resources/prepare-your-quote",
  "/es/resources/prepare-your-quote",
  "/resources/compare-impact-products",
  "/es/resources/compare-impact-products",
] as const;

const companyRoutes = new Set<string>(COMPANY_PUBLIC_ROUTES);

export function isCompanyPublicRoute(pathname: string): boolean {
  return companyRoutes.has(pathname.replace(/\/+$/, ""));
}
