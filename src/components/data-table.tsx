"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ListFilter,
  X,
} from "lucide-react";

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
  type: "text" | "select" | "date-range";
  placeholder?: string;
  allLabel?: string;
  options?: DataTableFilterOption[];
  faceted?: boolean;
}

export interface DataTableDateRangeValue {
  from?: string;
  to?: string;
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
  // Conserva filtros durante navegación y recargas de la pestaña.
  filterStorageKey?: string;

  pagination?: boolean;
  maxHeightClassName?: string;
}

const ALL_FILTER_VALUE = "__all__";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder,
  filters,
  filterPlacement = "toolbar",
  collapsibleFilters = false,
  filterStorageKey,
  pagination = false,
  maxHeightClassName = "max-h-[520px]",
}: DataTableProps<TData, TValue>) {
  const storageKey = filterStorageKey
    ? `data-table:${filterStorageKey}:filters`
    : null;

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [paginationState, setPaginationState] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const [filtersVisible, setFiltersVisible] = React.useState(
    () => !collapsibleFilters,
  );

  const [storageRestored, setStorageRestored] = React.useState(
    () => !storageKey,
  );

  React.useEffect(() => {
    if (!storageKey) {
      setStorageRestored(true);
      return;
    }

    try {
      const savedState = window.sessionStorage.getItem(storageKey);

      if (savedState) {
        const parsed = JSON.parse(savedState) as {
          columnFilters?: unknown;
          filtersVisible?: unknown;
          pagination?: unknown;
        };

        if (Array.isArray(parsed.columnFilters)) {
          const restoredFilters = parsed.columnFilters as ColumnFiltersState;

          setColumnFilters(restoredFilters);

          if (typeof parsed.filtersVisible === "boolean") {
            setFiltersVisible(parsed.filtersVisible);
          } else if (restoredFilters.length > 0) {
            setFiltersVisible(true);
          }
        }

        if (
          pagination &&
          parsed.pagination &&
          typeof parsed.pagination === "object"
        ) {
          const savedPagination = parsed.pagination as Partial<PaginationState>;
          if (
            typeof savedPagination.pageIndex === "number" &&
            Number.isSafeInteger(savedPagination.pageIndex) &&
            savedPagination.pageIndex >= 0 &&
            typeof savedPagination.pageSize === "number" &&
            PAGE_SIZE_OPTIONS.includes(savedPagination.pageSize)
          ) {
            setPaginationState({
              pageIndex: savedPagination.pageIndex,
              pageSize: savedPagination.pageSize,
            });
          }
        }
      }
    } catch {
      // La tabla continúa funcionando si sessionStorage no está disponible.
    } finally {
      setStorageRestored(true);
    }
  }, [pagination, storageKey]);

  React.useEffect(() => {
    if (!storageKey || !storageRestored) {
      return;
    }

    try {
      if (
        columnFilters.length === 0 &&
        (!pagination ||
          (paginationState.pageIndex === 0 &&
            paginationState.pageSize === DEFAULT_PAGE_SIZE))
      ) {
        window.sessionStorage.removeItem(storageKey);
        return;
      }

      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          columnFilters,
          filtersVisible,
          ...(pagination ? { pagination: paginationState } : {}),
        }),
      );
    } catch {
      // La tabla continúa funcionando si sessionStorage no está disponible.
    }
  }, [
    columnFilters,
    filtersVisible,
    pagination,
    paginationState,
    storageKey,
    storageRestored,
  ]);

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
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      if (pagination) {
        setPaginationState((current) =>
          current.pageIndex === 0 ? current : { ...current, pageIndex: 0 },
        );
      }
    },
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    autoResetPageIndex: false,
    onPaginationChange: setPaginationState,
    state: {
      columnFilters,
      pagination: paginationState,
    },
  });

  const clearFilters = () => {
    table.resetColumnFilters();

    if (!storageKey) {
      return;
    }

    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // La tabla continúa funcionando si sessionStorage no está disponible.
    }
  };

  const filtersByColumnId = React.useMemo(
    () => new Map(configuredFilters.map((filter) => [filter.columnId, filter])),
    [configuredFilters],
  );

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredCount / paginationState.pageSize),
  );
  const currentPage = Math.min(paginationState.pageIndex + 1, pageCount);
  const firstItem =
    filteredCount === 0 ? 0 : (currentPage - 1) * paginationState.pageSize + 1;
  const lastItem = Math.min(currentPage * paginationState.pageSize, filteredCount);

  React.useEffect(() => {
    if (!pagination || !storageRestored) return;

    // Conserva una página válida si se elimina el último registro de la lista.
    setPaginationState((current) => {
      const lastPageIndex = Math.max(
        0,
        Math.ceil(filteredCount / current.pageSize) - 1,
      );
      return current.pageIndex > lastPageIndex
        ? { ...current, pageIndex: lastPageIndex }
        : current;
    });
  }, [filteredCount, pagination, storageRestored]);

  React.useEffect(() => {
    if (pagination) scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [
    columnFilters,
    pagination,
    paginationState.pageIndex,
    paginationState.pageSize,
  ]);

  const activeFilterCount = columnFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  const showHeaderFilters =
    filterPlacement === "header" && (!collapsibleFilters || filtersVisible);

  const renderFilterControl = (filter: DataTableFilter, compact = false) => {
    const column = table.getColumn(filter.columnId);

    if (!column) {
      return null;
    }

    if (filter.type === "date-range") {
      const currentValue =
        (column.getFilterValue() as DataTableDateRangeValue | undefined) ?? {};

      const updateDateRange = (
        field: keyof DataTableDateRangeValue,
        value: string,
      ) => {
        const nextValue: DataTableDateRangeValue = {
          ...currentValue,
          [field]: value || undefined,
        };

        if (!nextValue.from && !nextValue.to) {
          column.setFilterValue(undefined);
          return;
        }

        column.setFilterValue(nextValue);
      };

      return (
        <div
          className={
            compact
              ? "flex min-w-[285px] items-center gap-1"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <Input
            type="date"
            aria-label={`${filter.placeholder ?? "Date"} from`}
            value={currentValue.from ?? ""}
            max={currentValue.to}
            onChange={(event) => updateDateRange("from", event.target.value)}
            className={
              compact
                ? "h-8 w-[128px] px-2 text-xs font-normal normal-case"
                : "w-[150px] font-normal normal-case"
            }
          />

          <span className="text-xs font-normal normal-case text-muted-foreground">
            to
          </span>

          <Input
            type="date"
            aria-label={`${filter.placeholder ?? "Date"} to`}
            value={currentValue.to ?? ""}
            min={currentValue.from}
            onChange={(event) => updateDateRange("to", event.target.value)}
            className={
              compact
                ? "h-8 w-[128px] px-2 text-xs font-normal normal-case"
                : "w-[150px] font-normal normal-case"
            }
          />
        </div>
      );
    }

    if (filter.type === "select") {
      const currentValue = column.getFilterValue();
      const facetedValues = new Set(
        Array.from(column.getFacetedUniqueValues().keys(), (value) =>
          String(value),
        ),
      );

      const availableOptions = (filter.options ?? []).filter((option) => {
        if (!filter.faceted) return true;

        // Conserva visible la selección actual para que se pueda limpiar.
        const isCurrentSelection =
          currentValue !== undefined &&
          String(option.value) === String(currentValue);

        return isCurrentSelection || facetedValues.has(String(option.value));
      });

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

            {availableOptions.map((option) => (
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
              onClick={clearFilters}
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
              onClick={clearFilters}
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
        <div
          ref={scrollContainerRef}
          className={`${maxHeightClassName} overflow-auto`}
        >
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

      {pagination && (
        <div className="flex flex-col gap-3 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-muted-foreground" aria-live="polite">
              Showing {firstItem}–{lastItem} of {filteredCount}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={String(paginationState.pageSize)}
                onValueChange={(value) => {
                  const pageSize = Number(value);
                  if (PAGE_SIZE_OPTIONS.includes(pageSize)) {
                    setPaginationState({ pageIndex: 0, pageSize });
                  }
                }}
              >
                <SelectTrigger aria-label="Rows per page" className="h-9 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((pageSize) => (
                    <SelectItem key={pageSize} value={String(pageSize)}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <nav
            aria-label="Table pagination"
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="First page"
              title="First page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 px-2 sm:px-3"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="min-w-24 whitespace-nowrap text-center">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 px-2 sm:px-3"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label="Last page"
              title="Last page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pageCount - 1)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}
