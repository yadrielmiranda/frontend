"use client";

import { useCallback, useMemo, useState } from "react";

import {
  DataTable,
  type DataTableFilter,
  type DataTableFilterOption,
} from "@/components/data-table";
import type { ProductWithBrands, SystemWithConfigs, PricingRange } from "@/lib/types";

import {
  getPricingRangeColumns,
  type PricingRangeListRow,
} from "./columns-pricing-ranges";

function createOptions(
  values: Array<string | null | undefined>,
): DataTableFilterOption[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
}

export function PricingRangesClient({
  initialRanges,
  productsWithBrands,
  systemsWithConfigs,
}: {
  initialRanges: PricingRange[];
  productsWithBrands: ProductWithBrands[];
  systemsWithConfigs: SystemWithConfigs[];
}) {
  const [ranges, setRanges] = useState(initialRanges);

  const rows = useMemo<PricingRangeListRow[]>(() => {
    return ranges.map((range) => {
      const system = systemsWithConfigs.find(
        (item) => item.id === range.idSystem,
      );

      const product = productsWithBrands.find(
        (item) => item.id === system?.idProduct,
      );

      const brand = product?.brandProducts.find(
        (item) => item.brand.id === system?.idBrand,
      )?.brand;

      const config = system?.sysconfs.find(
        (item) => item.config.id === range.idConfig,
      )?.config;

      return {
        ...range,
        productName: product?.name ?? `Product #${system?.idProduct ?? "?"}`,
        brandName: brand?.name ?? `Brand #${system?.idBrand ?? "?"}`,
        systemName: system?.name ?? `System #${range.idSystem}`,
        configConf: config?.conf ?? `Config #${range.idConfig}`,
      };
    });
  }, [ranges, productsWithBrands, systemsWithConfigs]);

  const handleDeleted = useCallback((id: number) => {
    setRanges((current) => current.filter((range) => range.id !== id));
  }, []);

  const columns = useMemo(
    () => getPricingRangeColumns(handleDeleted),
    [handleDeleted],
  );

  const filters = useMemo<DataTableFilter[]>(() => {
    return [
      {
        columnId: "id",
        type: "text",
        placeholder: "Filter range #...",
      },
      {
        columnId: "productName",
        type: "select",
        faceted: true,
        allLabel: "All products",
        options: createOptions(rows.map((row) => row.productName)),
      },
      {
        columnId: "brandName",
        type: "select",
        faceted: true,
        allLabel: "All brands",
        options: createOptions(rows.map((row) => row.brandName)),
      },
      {
        columnId: "systemName",
        type: "text",
        placeholder: "Filter system...",
      },
      {
        columnId: "configConf",
        type: "select",
        faceted: true,
        allLabel: "All configurations",
        options: createOptions(rows.map((row) => row.configConf)),
      },
      {
        columnId: "code",
        type: "text",
        placeholder: "Filter code...",
      },
      {
        columnId: "crystalNames",
        type: "text",
        placeholder: "Filter crystal...",
      },
      {
        columnId: "status",
        type: "select",
        faceted: true,
        allLabel: "All statuses",
        options: [
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ],
      },
    ];
  }, [rows]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      filters={filters}
      filterPlacement="header"
      collapsibleFilters
      filterStorageKey="pricing-ranges"
    />
  );
}
