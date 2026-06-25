import { apiFetch } from "./_base";
import type { ConfigCategory } from "@/lib/types";

export type CreateConfigCategoryData = {
    name: string;
    idProduct: number;
    sortOrder?: number;
    isActive?: boolean;
};

export type UpdateConfigCategoryData = {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
};

export function getConfigCategories() {
    return apiFetch<ConfigCategory[]>("/api/config-categories");
}

export function getConfigCategoriesByProduct(productId: number) {
    return apiFetch<ConfigCategory[]>(
        `/api/config-categories/product/${productId}`,
    );
}

export function createConfigCategory(data: CreateConfigCategoryData) {
    return apiFetch<ConfigCategory>("/api/config-categories", {
        method: "POST",
        body: data,
    });
}

export function updateConfigCategory(
    id: number,
    data: UpdateConfigCategoryData,
) {
    return apiFetch<ConfigCategory>(`/api/config-categories/${id}`, {
        method: "PATCH",
        body: data,
    });
}

export function deleteConfigCategory(id: number) {
    return apiFetch<ConfigCategory>(`/api/config-categories/${id}`, {
        method: "DELETE",
    });
}