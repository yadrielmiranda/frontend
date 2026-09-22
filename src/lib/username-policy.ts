export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 24;

export const USERNAME_PATTERN =
  /^[A-Za-z](?:[A-Za-z0-9]|[._-](?=[A-Za-z0-9])){3,23}$/;

export const USERNAME_VALIDATION_MESSAGE =
  "Username must be 4–24 characters, start with a letter, use only letters, numbers, dots, underscores or hyphens, and cannot repeat or end with a separator.";

export function isValidUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_PATTERN.test(value.trim());
}
