export const PIECE_MARK_MAX_LENGTH = 20;

export function normalizePieceMark(value: string | null | undefined): string {
  return String(value ?? "").trim();
}
