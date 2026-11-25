export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 24;

export const USERNAME_PATTERN =
  /^[A-Za-z](?:[A-Za-z0-9]|[._-](?=[A-Za-z0-9])){3,23}$/;

export const USERNAME_VALIDATION_MESSAGE =
  "Username must be 4–24 characters, start with a letter, use only letters, numbers, dots, underscores or hyphens, and cannot repeat or end with a separator.";

export function isValidUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_PATTERN.test(value.trim());
}

const combiningMarks = new RegExp("\\p{M}", "gu");

// Preview only. The server assigns the final available username on creation.
export function suggestedClientUsername(firstName: string, lastName: string, fallback: "Client" | "Dealer" = "Client"): string {
  const parts = [firstName, lastName].flatMap(name =>
    name.normalize("NFKD").replace(combiningMarks, "").split(/[^A-Za-z0-9]+/).filter(Boolean),
  );
  const base = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("").replace(/^\d+/, "");
  if (!base) return fallback;
  return (base.length < USERNAME_MIN_LENGTH ? base + "User" : base).slice(0, USERNAME_MAX_LENGTH);
}
