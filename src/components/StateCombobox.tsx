"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { US_STATES } from "@/lib/us-states";

type StateComboboxAppearance = "light" | "dark";

type Props<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  appearance?: StateComboboxAppearance;
};

export function StateCombobox<TFieldValues extends FieldValues>({
  control,
  name,
  label = "State",
  placeholder = "Select state...",
  disabled,
  error,
  appearance = "light",
}: Props<TFieldValues>) {
  const [open, setOpen] = React.useState(false);
  const isDark = appearance === "dark";

  const byValue = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of US_STATES) map.set(s.value, s.label);
    return map;
  }, []);

  const labelClass = isDark ? "text-xs font-medium text-white" : undefined;

  const triggerClass = isDark
    ? "h-11 w-full justify-between border-white/15 bg-black/35 text-white hover:bg-black/45 hover:text-white focus-visible:ring-red-600"
    : "w-full justify-between";

  const popoverClass = isDark
    ? "w-[--radix-popover-trigger-width] border-white/15 bg-[#080808] p-0 text-white shadow-2xl"
    : "w-[--radix-popover-trigger-width] p-0";

  const errorClass = isDark ? "text-xs text-red-400" : "text-sm text-red-600";

  return (
    <div className="space-y-2">
      <Label className={labelClass}>{label}</Label>

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const currentLabel = field.value
            ? byValue.get(String(field.value))
            : undefined;

          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    triggerClass,
                    !currentLabel && isDark && "text-white/35",
                    error && "border-red-500",
                  )}
                  disabled={disabled}
                >
                  <span className="truncate">
                    {currentLabel
                      ? `${currentLabel} (${String(field.value)})`
                      : placeholder}
                  </span>

                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className={popoverClass} align="start">
                <Command
                  className={isDark ? "bg-[#080808] text-white" : undefined}
                >
                  <CommandInput
                    placeholder="Type to search..."
                    className={
                      isDark
                        ? "border-white/10 text-white placeholder:text-white/35"
                        : undefined
                    }
                  />

                  <CommandList>
                    <CommandEmpty
                      className={
                        isDark
                          ? "py-6 text-center text-sm text-white/45"
                          : undefined
                      }
                    >
                      No state found.
                    </CommandEmpty>

                    <CommandGroup>
                      {US_STATES.map((s) => (
                        <CommandItem
                          key={s.value}
                          value={`${s.label} ${s.value}`}
                          onSelect={() => {
                            field.onChange(s.value);
                            field.onBlur();
                            setOpen(false);
                          }}
                          className={
                            isDark
                              ? "text-white/80 aria-selected:bg-red-600/20 aria-selected:text-white"
                              : undefined
                          }
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              String(field.value) === s.value
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {s.label} ({s.value})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          );
        }}
      />

      {error ? <p className={errorClass}>{error}</p> : null}
    </div>
  );
}
