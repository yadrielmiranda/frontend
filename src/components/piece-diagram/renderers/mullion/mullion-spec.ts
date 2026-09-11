import mullion1x3 from "./assets/Mullion_1x3_clips_al_ras.png";
import mullion1x4 from "./assets/Mullion_1x4_clips_al_ras.png";
import mullion2x4 from "./assets/Mullion_2x4_clips_al_ras.png";
import mullion2x6 from "./assets/Mullion_2x6_clips_al_ras.png";

export type MullionProfile = "1x3" | "1x4" | "2x4" | "2x6";

export type MullionDiagramSpec = Readonly<{
  profile: MullionProfile;
  image: Readonly<{ src: string; width: number; height: number }>;
  bounds: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

// Imágenes originales del usuario. Los límites eliminan solo el lienzo transparente.
const MULLION_SPECS: Record<MullionProfile, MullionDiagramSpec> = {
  "1x3": {
    profile: "1x3", image: mullion1x3,
    bounds: { x: 60, y: 18, width: 1885, height: 264 },
  },
  "1x4": {
    profile: "1x4", image: mullion1x4,
    bounds: { x: 60, y: 18, width: 1902, height: 269 },
  },
  "2x4": {
    profile: "2x4", image: mullion2x4,
    bounds: { x: 60, y: 13, width: 1902, height: 284 },
  },
  "2x6": {
    profile: "2x6", image: mullion2x6,
    bounds: { x: 60, y: 13, width: 1938, height: 294 },
  },
};

/** No depende de IDs de la base de datos ni reemplaza otros materiales lineales. */
export function resolveMullionSpec({
  configuration,
  systemName,
}: {
  configuration?: string | null;
  systemName?: string | null;
}): MullionDiagramSpec | null {
  const system = systemName?.trim().replace(/\s+/g, " ").toLowerCase();
  if (system && system !== "clipped aluminum tube mullion") return null;

  const match = configuration?.trim().match(
    /^(1|2)\s*[x×]\s*(3|4|6)\s+standard\s+mullion\s+w\s*\/\s*clips$/i,
  );
  if (!match) return null;

  const profile = `${match[1]}x${match[2]}`;
  return Object.prototype.hasOwnProperty.call(MULLION_SPECS, profile)
    ? MULLION_SPECS[profile as MullionProfile]
    : null;
}
