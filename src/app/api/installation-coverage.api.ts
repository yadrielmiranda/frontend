import { apiFetch } from "./_base";

export type InstallationCoverageChargeType = "FIXED" | "PERCENTAGE";

export type InstallationCoverage = {
  id: number;
  revision: number;
  originStreet: string;
  originCity: string;
  originState: string;
  originPostalCode: string;
  maxDistanceMiles: string;
  includedMiles: string;
  hoursPerDay: string;
  ranges: {
    fromMiles: string;
    upToMiles: string;
    chargeType: InstallationCoverageChargeType;
    value: string;
    // Los rangos guardados antes del cargo diario se interpretan como cero.
    dailyCharge?: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type SaveInstallationCoverageInput = Pick<
  InstallationCoverage,
  | "revision"
  | "originStreet"
  | "originCity"
  | "originState"
  | "originPostalCode"
> & {
  maxDistanceMiles: number;
  includedMiles: number;
  hoursPerDay: number;
  ranges: {
    upToMiles: number;
    chargeType: InstallationCoverageChargeType;
    value: number;
    dailyCharge: number;
  }[];
};

export async function getInstallationCoverage() {
  const response = await apiFetch<{
    configuration: InstallationCoverage | null;
  }>("/api/installation-coverage", { cache: "no-store" });
  return response.configuration;
}

export function saveInstallationCoverage(data: SaveInstallationCoverageInput) {
  return apiFetch<InstallationCoverage>("/api/installation-coverage", {
    method: "PUT",
    body: data,
  });
}
