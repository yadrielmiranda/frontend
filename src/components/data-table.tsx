"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ListFilter, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataTableFilterValue = string | number | boolean;

export interface DataTableFilterOption {
  label: string;
  value: DataTableFilterValue;
}

export interface DataTableFilter {
  columnId: string;
  type: "text" | "select";
  placeholder?: string;
  allLabel?: string;
  options?: DataTableFilterOption[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Mantiene compatibilidad con las tablas existentes.
  filterColumnId?: string;
  filterPlaceholder?: string;

  // Permite definir varios filtros combinables.
  filters?: DataTableFilter[];

  // Define si los filtros aparecen arriba o dentro del encabezado.
  filterPlacement?: "toolbar" | "header";

  // Permite mostrar u ocultar los filtros del encabezado.
  collapsibleFilters?: boolean;

  maxHeightClassName?: string;
}

const ALL_FILTER_VALUE = "__all__";

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder,
  filters,
  filterPlacement = "toolbar",
  collapsibleFilters = false,
  maxHeightClassName = "max-h-[520px]",
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );

  const [filtersVisible, setFiltersVisible] = React.useState(
    () => !collapsibleFilters,
  );

  const configuredFilters = React.useMemo<DataTableFilter[]>(() => {
    if (filters?.length) {
      return filters;
    }

    if (filterColumnId) {
      return [
        {
          columnId: filterColumnId,
          type: "text",
          placeholder: filterPlaceholder ?? "Filter...",
        },
      ];
    }

    return [];
  }, [filterColumnId, filterPlaceholder, filters]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  const filtersByColumnId = React.useMemo(
    () => new Map(configuredFilters.map((filter) => [filter.columnId, filter])),
    [configuredFilters],
  );

  const filteredCount = table.getFilteredRowModel().rows.length;
  const activeFilterCount = columnFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  const showHeaderFilters =
    filterPlacement === "header" && (!collapsibleFilters || filtersVisible);

  const renderFilterControl = (filter: DataTableFilter, compact = false) => {
    const column = table.getColumn(filter.columnId);

    if (!column) {
      return null;
    }

    if (filter.type === "select") {
      const currentValue = column.getFilterValue();

      return (
        <Select
          value={
            currentValue === undefined ? ALL_FILTER_VALUE : String(currentValue)
          }
          onValueChange={(value) => {
            if (value === ALL_FILTER_VALUE) {
              column.setFilterValue(undefined);
              return;
            }

            const selectedOption = filter.options?.find(
              (option) => String(option.value) === value,
            );

            column.setFilterValue(selectedOption?.value);
          }}
        >
          <SelectTrigger
            aria-label={filter.placeholder ?? filter.allLabel ?? "Filter"}
            className={
              compact
                ? "h-8 w-full min-w-[130px] font-normal normal-case"
                : "w-full font-normal normal-case sm:w-[210px]"
            }
          >
            <SelectValue placeholder={filter.placeholder ?? "Select filter"} />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>
              {filter.allLabel ?? "All"}
            </SelectItem>

            {filter.options?.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        aria-label={filter.placeholder ?? "Filter"}
        placeholder={filter.placeholder ?? "Filter..."}
        value={(column.getFilterValue() as string) ?? ""}
        onChange={(event) => column.setFilterValue(event.target.value)}
        className={
          compact
            ? "h-8 w-full min-w-[130px] font-normal normal-case"
            : "w-full font-normal normal-case sm:max-w-xs"
        }
      />
    );
  };

  const resultsLabel = hasActiveFilters
    ? `${filteredCount} of ${data.length} results`
    : `${data.length} ${data.length === 1 ? "result" : "results"}`;

  return (
    <div>
      {configuredFilters.length > 0 && filterPlacement === "toolbar" && (
        <div className="flex flex-wrap items-center gap-3 py-4">
          {configuredFilters.map((filter) => (
            <React.Fragment key={filter.columnId}>
              {renderFilterControl(filter)}
            </React.Fragment>
          ))}

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="gap-2"
            >
              Clear filters
              <X className="h-4 w-4" />
            </Button>
          )}

          <span className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
            {resultsLabel}
          </span>
        </div>
      )}

      {configuredFilters.length > 0 && filterPlacement === "header" && (
        <div className="flex min-h-10 items-center justify-end gap-2 py-2">
          {collapsibleFilters && (
            <Button
              type="button"
              variant={hasActiveFilters ? "secondary" : "outline"}
              size="sm"
              aria-expanded={filtersVisible}
              onClick={() => setFiltersVisible((current) => !current)}
              className="gap-2"
            >
              <ListFilter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              {filtersVisible ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="gap-2"
            >
              Clear filters
              <X className="h-4 w-4" />
            </Button>
          )}

          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {resultsLabel}
          </span>
        </div>
      )}

      <div className="rounded-md border">
        <div className={`${maxHeightClassName} overflow-auto`}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const headerFilter = showHeaderFilters
                      ? filtersByColumnId.get(header.column.id)
                      : undefined;

                    return (
                      <TableHead
                        key={header.id}
                        className="align-top text-foreground/80"
                      >
                        <div
                          className={headerFilter ? "space-y-2 py-2" : "py-2"}
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </div>

                          {headerFilter &&
                            renderFilterControl(headerFilter, true)}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
