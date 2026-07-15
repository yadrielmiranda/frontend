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
import { X } from "lucide-react";

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

  maxHeightClassName?: string;
}

const ALL_FILTER_VALUE = "__all__";

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder,
  filters,
  maxHeightClassName = "max-h-[520px]",
}: DataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
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

  const filteredCount = table.getFilteredRowModel().rows.length;
  const hasActiveFilters = columnFilters.length > 0;

  return (
    <div>
      {configuredFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 py-4">
          {configuredFilters.map((filter) => {
            const column = table.getColumn(filter.columnId);

            if (!column) {
              return null;
            }

            if (filter.type === "select") {
              const currentValue = column.getFilterValue();

              return (
                <Select
                  key={filter.columnId}
                  value={
                    currentValue === undefined
                      ? ALL_FILTER_VALUE
                      : String(currentValue)
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
                  <SelectTrigger className="w-full sm:w-[210px]">
                    <SelectValue
                      placeholder={filter.placeholder ?? "Select filter"}
                    />
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
                key={filter.columnId}
                placeholder={filter.placeholder ?? "Filter..."}
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className="w-full sm:max-w-xs"
              />
            );
          })}

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
            {hasActiveFilters
              ? `${filteredCount} of ${data.length} results`
              : `${data.length} results`}
          </span>
        </div>
      )}

      <div className="rounded-md border">
        <div className={`${maxHeightClassName} overflow-auto`}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-semibold uppercase tracking-wide text-foreground/80"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
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
