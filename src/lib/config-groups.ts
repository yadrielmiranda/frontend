export type ConfigLike = {
    id: number;
    conf: string;
    category?: {
        id: number;
        name: string;
        sortOrder?: number | null;
    } | null;
};

export type ConfigCategoryGroup<T extends ConfigLike> = {
    key: string;
    name: string;
    sortOrder: number;
    items: T[];
};

export function groupConfigsByCategory<T extends ConfigLike>(configs: T[]) {
    const uncategorized: T[] = [];
    const groups = new Map<string, ConfigCategoryGroup<T>>();

    for (const config of configs) {
        const category = config.category;

        if (!category?.id || !category.name) {
            uncategorized.push(config);
            continue;
        }

        const key = String(category.id);

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                name: category.name,
                sortOrder: Number(category.sortOrder ?? 0),
                items: [],
            });
        }

        groups.get(key)!.items.push(config);
    }

    const sortItems = (items: T[]) =>
        [...items].sort((a, b) => a.conf.localeCompare(b.conf));

    return {
        hasCategories: groups.size > 0,
        uncategorized: sortItems(uncategorized),
        groups: Array.from(groups.values())
            .map((group) => ({
                ...group,
                items: sortItems(group.items),
            }))
            .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
                return a.name.localeCompare(b.name);
            }),
    };
}