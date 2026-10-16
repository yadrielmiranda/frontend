"use client";

import * as React from "react";
import {
  autocompleteAddress,
  getPlaceAddress,
  type PlaceAddress,
  type PlaceSuggestion,
  type PlacesAccess,
} from "@/app/api/geo.api";
import { Input } from "@/components/ui/input";

type AddressAutocompleteProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onSelect"
> & {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onAddressSelect: (address: PlaceAddress) => void;
  /** Changing another address field cancels a pending selection. */
  contextKey?: string;
  access?: PlacesAccess;
};

type Status = "idle" | "searching" | "results" | "empty" | "unavailable" | "resolving";

function createSessionToken() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // randomUUID requires HTTPS; getRandomValues also works on local HTTP networks.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  contextKey = "",
  access = "authenticated",
  onBlur,
  onFocus,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  disabled,
  readOnly,
  id,
  ...inputProps
}: AddressAutocompleteProps) {
  const generatedId = React.useId();
  const listId = `${id ?? generatedId}-suggestions`;
  const [suggestions, setSuggestions] = React.useState<PlaceSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [status, setStatus] = React.useState<Status>("idle");
  const focused = React.useRef(false);
  const mounted = React.useRef(true);
  const composing = React.useRef(false);
  const revision = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedValue = React.useRef(value);
  const previousContext = React.useRef(contextKey);
  const previousAccess = React.useRef(access);
  const session = React.useRef<{ token: string; startedAt: number } | null>(null);
  const displayedSession = React.useRef<string | null>(null);
  const latest = React.useRef({ value, contextKey, access, disabled, readOnly, onAddressSelect });
  latest.current = { value, contextKey, access, disabled, readOnly, onAddressSelect };

  const cancel = React.useCallback(() => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    session.current = null;
    displayedSession.current = null;
    setSuggestions([]);
    setActiveIndex(-1);
    setStatus("idle");
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  React.useEffect(() => {
    if (value !== expectedValue.current || contextKey !== previousContext.current || access !== previousAccess.current || disabled || readOnly) {
      cancel();
    }
    expectedValue.current = value;
    previousContext.current = contextKey;
    previousAccess.current = access;
  }, [value, contextKey, access, disabled, readOnly, cancel]);

  function isCurrent(request: number, street: string, context: string) {
    return mounted.current && focused.current && revision.current === request &&
      latest.current.value === street && latest.current.contextKey === context && latest.current.access === access &&
      !latest.current.disabled && !latest.current.readOnly;
  }

  function search(street: string) {
    const request = ++revision.current;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    displayedSession.current = null;
    setSuggestions([]);
    setActiveIndex(-1);
    if (street.trim().length < 3 || composing.current || disabled || readOnly) {
      setStatus("idle");
      return;
    }
    const context = contextKey;
    setStatus("searching");
    timer.current = setTimeout(async () => {
      timer.current = null;
      if (!isCurrent(request, street, context)) return;
      try {
        if (!session.current || Date.now() - session.current.startedAt > 180000) {
          session.current = { token: createSessionToken(), startedAt: Date.now() };
        }
        const token = session.current.token;
        const response = await autocompleteAddress(street.trim(), token, access);
        if (!isCurrent(request, street, context)) return;
        displayedSession.current = token;
        setSuggestions(response.suggestions);
        setActiveIndex(response.suggestions.length ? 0 : -1);
        setStatus(response.suggestions.length ? "results" : "empty");
      } catch {
        if (isCurrent(request, street, context)) setStatus("unavailable");
      }
    }, 300);
  }

  async function selectAddress(suggestion: PlaceSuggestion) {
    const token = displayedSession.current;
    if (!token || status !== "results" || disabled || readOnly) return;
    const request = ++revision.current;
    const street = value;
    const context = contextKey;
    // Details consumes this session. New typing must start another one, even while it is pending.
    session.current = null;
    displayedSession.current = null;
    setSuggestions([]);
    setActiveIndex(-1);
    setStatus("resolving");
    try {
      const address = await getPlaceAddress(suggestion.placeId, token, access);
      if (!isCurrent(request, street, context)) return;
      setStatus("idle");
      latest.current.onAddressSelect(address);
    } catch {
      if (isCurrent(request, street, context)) setStatus("unavailable");
    }
  }

  const open = status !== "idle" && !disabled && !readOnly;
  const message = status === "searching" ? "Searching addresses…"
    : status === "resolving" ? "Loading address…"
      : status === "empty" ? "No matching addresses. You can enter the address manually."
        : status === "unavailable" ? "Address suggestions are unavailable. You can enter the address manually."
          : null;

  return (
    <div className="relative min-w-0">
      <Input
        {...inputProps}
        id={id}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onChange={(event) => {
          expectedValue.current = event.target.value;
          onChange(event);
          search(event.target.value);
        }}
        onFocus={(event) => {
          focused.current = true;
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focused.current = false;
          cancel();
          onBlur?.(event);
        }}
        onCompositionStart={(event) => {
          composing.current = true;
          cancel();
          onCompositionStart?.(event);
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          search(event.currentTarget.value);
          onCompositionEnd?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.nativeEvent.isComposing || composing.current) return;
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
            event.preventDefault();
            setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            if (suggestions[activeIndex]) void selectAddress(suggestions[activeIndex]);
          }
        }}
      />
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-lg">
          {message && <p role="status" className="px-3 py-3 text-sm text-slate-600">{message}</p>}
          <ul id={listId} role="listbox" aria-label="Address suggestions" className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${index}`}
                  tabIndex={-1}
                  aria-selected={index === activeIndex}
                  aria-label={suggestion.text}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${index === activeIndex ? "bg-blue-50" : ""}`}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => void selectAddress(suggestion)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="block font-medium">{suggestion.mainText || suggestion.text}</span>
                  {suggestion.secondaryText && <span className="block text-xs text-slate-600">{suggestion.secondaryText}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-100 px-3 py-2 text-right">
            <span translate="no" className="notranslate" style={{ color: "#5E5E5E", fontSize: 12, fontWeight: 400, whiteSpace: "nowrap" }}>Google Maps</span>
          </div>
        </div>
      )}
    </div>
  );
}
