"use client";

import { forwardRef, useEffect, useRef, useState, type ComponentProps } from "react";
import Image from "next/image";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/max";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { internationalPhoneInputValue, nationalPhoneInputValue, normalizePhoneToE164, phoneCountry } from "@/lib/validators-phone";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries().map(code => ({ code, name: countryNames.of(code) ?? code, callingCode: getCountryCallingCode(code) }))
  .sort((a, b) => a.code === "US" ? -1 : b.code === "US" ? 1 : a.name.localeCompare(b.name, "en"));

function CountryFlag({ country }: { country: CountryCode }) {
  return <Image src={`/country-flags/${country}.svg`} alt="" aria-hidden="true"
    width={22} height={15} unoptimized className="h-[15px] w-[22px] shrink-0 rounded-[2px] object-cover" />;
}

type Props = Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: string | null;
  onChange: (value: string) => void;
  defaultCountry?: CountryCode;
  appearance?: "light" | "dark";
  countryClassName?: string;
};

export const InternationalPhoneInput = forwardRef<HTMLInputElement, Props>(function InternationalPhoneInput({
  value, onChange, onBlur, defaultCountry = "US", appearance = "light", countryClassName,
  className, disabled, readOnly, ...inputProps
}, ref) {
  const [country, setCountry] = useState<CountryCode>(() => phoneCountry(value) ?? defaultCountry);
  const [draft, setDraft] = useState(() => nationalPhoneInputValue(value ?? "", phoneCountry(value) ?? defaultCountry));
  const [open, setOpen] = useState(false);
  const lastValue = useRef(value ?? "");
  const dark = appearance === "dark";
  const countryName = countryNames.of(country) ?? country;

  useEffect(() => {
    // Parent resets and saved profile updates must replace the local editing draft.
    if ((value ?? "") === lastValue.current) return;
    const nextCountry = phoneCountry(value) ?? defaultCountry;
    lastValue.current = value ?? "";
    setCountry(nextCountry);
    setDraft(nationalPhoneInputValue(value ?? "", nextCountry));
  }, [value, defaultCountry]);

  function publish(raw: string, selectedCountry: CountryCode) {
    const next = internationalPhoneInputValue(raw, selectedCountry);
    lastValue.current = next;
    onChange(next);
  }

  return <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open}
          aria-label={`Phone country: ${countryName} (+${getCountryCallingCode(country)})`}
          title={countryName}
          disabled={disabled || readOnly}
          className={cn("w-auto min-w-0 justify-between gap-1.5 px-2.5 font-normal has-[>svg]:px-2.5", dark && "h-11 border-white/15 bg-black/35 text-white hover:bg-black/45 hover:text-white", countryClassName)}>
          <CountryFlag country={country} />
          <span>{country} +{getCountryCallingCode(country)}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-80 max-w-[calc(100vw-2rem)] p-0", dark && "border-white/15 bg-[#080808] text-white")}>
        <Command className={dark ? "bg-[#080808] text-white" : undefined}>
          <CommandInput placeholder="Search country or code..." aria-label="Search phone country" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map(option => <CommandItem key={option.code} value={`${option.name} ${option.code} +${option.callingCode}`}
                className={dark ? "text-white/80 aria-selected:bg-red-600/20 aria-selected:text-white" : undefined}
                onSelect={() => {
                  const national = nationalPhoneInputValue(lastValue.current, country);
                  setCountry(option.code);
                  setDraft(national);
                  publish(national, option.code);
                  setOpen(false);
                }}>
                <CountryFlag country={option.code} />
                <span className="flex-1">{option.name} (+{option.callingCode})</span>
                <Check aria-hidden="true" className={cn("size-4 shrink-0", country === option.code ? "opacity-100" : "opacity-0")} />
              </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <Input {...inputProps} ref={ref} type="tel" inputMode="tel" autoComplete={inputProps.autoComplete ?? "tel-national"}
      disabled={disabled} readOnly={readOnly} className={cn("min-w-0", className)} value={draft}
      onChange={event => {
        const raw = event.target.value;
        const nextCountry = phoneCountry(raw) ?? country;
        setCountry(nextCountry);
        setDraft(raw);
        publish(raw, nextCountry);
      }}
      onBlur={event => {
        const normalized = normalizePhoneToE164(lastValue.current, country);
        if (normalized) {
          setDraft(nationalPhoneInputValue(normalized, country));
          if (normalized !== lastValue.current) {
            lastValue.current = normalized;
            onChange(normalized);
          }
        }
        onBlur?.(event);
      }} />
  </div>;
});
