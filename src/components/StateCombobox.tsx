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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { US_STATES } from "@/lib/us-states";

type Props<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
};

export function StateCombobox<TFieldValues extends FieldValues>({
  control,
  name,
  label = "State",
  placeholder = "Select state…",
  disabled,
  error,
}: Props<TFieldValues>) {
  const [open, setOpen] = React.useState(false);

  const byValue = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of US_STATES) map.set(s.value, s.label);
    return map;
  }, []);

  return (
    <div className="space-y-1">
      <Label>{label}</Label>

      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const currentLabel = field.value ? byValue.get(String(field.value)) : undefined;

          return (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn("w-full justify-between", error && "border-red-500")}
                  disabled={disabled}
                >
                  {currentLabel ? `${currentLabel} (${String(field.value)})` : placeholder}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Type to search…" />
                  <CommandList>
                    <CommandEmpty>No state found.</CommandEmpty>
                    <CommandGroup>
                      {US_STATES.map((s) => (
                        <CommandItem
                          key={s.value}
                          value={`${s.label} ${s.value}`}
                          onSelect={() => {
                            field.onChange(s.value);   // guarda el código (ej: "FL")
                            field.onBlur();
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              String(field.value) === s.value ? "opacity-100" : "opacity-0"
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
