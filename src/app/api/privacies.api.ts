import { apiFetch } from "./_base";
import type {
  CreatePrivacyData,
  Privacy,
  UpdatePrivacyData,
} from "@/lib/types";

export function getPrivacies() {
  return apiFetch<Privacy[]>("/api/privacies");
}

export function getPrivacy(id: number) {
  return apiFetch<Privacy>(`/api/privacies/${id}`);
}

export function createPrivacy(privacyData: CreatePrivacyData) {
  return apiFetch<Privacy>("/api/privacies", {
    method: "POST",
    body: privacyData,
  });
}

export function updatePrivacy(id: number, privacyData: UpdatePrivacyData) {
  return apiFetch<Privacy>(`/api/privacies/${id}`, {
    method: "PATCH",
    body: privacyData,
  });
}

export function deletePrivacy(id: number) {
  return apiFetch<Privacy>(`/api/privacies/${id}`, {
    method: "DELETE",
  });
}
