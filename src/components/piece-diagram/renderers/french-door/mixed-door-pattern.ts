export type FrenchDoorSectionKind = "O" | "X" | "XX";

// Bound preview work for malformed input without restricting the catalog.
// The central single/double door counts as one structural section.
export const MAX_FRENCH_DOOR_RENDER_SECTIONS = 128;

// A mixed assembly has one single/double door, with fixed panels on either
// side. Read its sections instead of limiting it to a catalog of examples.
export function mixedDoorPattern(
  configuration: string,
): FrenchDoorSectionKind[] | null {
  if (configuration.length > MAX_FRENCH_DOOR_RENDER_SECTIONS + 1) return null;
  const match = /^(O*)(X{1,2})(O*)$/.exec(configuration);
  if (!match || (!match[1] && !match[3])) return null;
  if (match[1].length + match[3].length + 1 > MAX_FRENCH_DOOR_RENDER_SECTIONS) return null;

  return [
    ...Array<FrenchDoorSectionKind>(match[1].length).fill("O"),
    match[2] as "X" | "XX",
    ...Array<FrenchDoorSectionKind>(match[3].length).fill("O"),
  ];
}
