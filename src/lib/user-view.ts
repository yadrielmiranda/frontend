import type { User } from "./types";

type ContactField = "email" | "phone" | "street" | "city" | "state" | "postalCode";
export type ApiUser = Omit<User, ContactField> & { [K in ContactField]: string | null };

// Normalización de presentación: los campos ausentes de técnicos siguen siendo NULL en la BD.
export function userView(user: ApiUser): User {
  return {
    ...user,
    email: user.email ?? "", phone: user.phone ?? "", street: user.street ?? "",
    city: user.city ?? "", state: user.state ?? "", postalCode: user.postalCode ?? "",
  };
}
