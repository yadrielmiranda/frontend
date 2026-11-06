// Exterior left/right edges where a fixed sidelite mates with an operable door.
export type JoinedJambs = { left: boolean; right: boolean };

export const FRAME_OVERLAP_INCHES = 0.5;
export const JOINED_JAMB_INCHES = 3;

export function joinedJambWidth(standaloneInches: number, joined?: boolean) {
  return joined ? JOINED_JAMB_INCHES : standaloneInches;
}
