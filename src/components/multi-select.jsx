import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { filterAirports } from "../lib/flight-utils";

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
  onClear,
  clearLabel = "Clear selection",
  clearDisabled = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const pasteFallbackRef = useRef(false);

  const resolvePastedCodes = (value) => {
    const codeSet = new Set(options.map((option) => option.code.toUpperCase()));
    const codeMatches = value.match(/[A-Za-z]{3}/g) || [];
    const matchedCodes = codeMatches
      .map((code) => code.toUpperCase())
      .filter((code) => codeSet.has(code));
    if (matchedCodes.length > 0) return matchedCodes;

    const optionMap = new Map(
      options.map((option) => [option.name.toLowerCase(), option.code]),
    );
    return value
      .split(/[,\n;\t]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        const upper = token.toUpperCase();
        if (codeSet.has(upper)) return upper;
        return optionMap.get(token.toLowerCase());
      })
      .filter(Boolean);
  };

  const filtered = useMemo(
    () => filterAirports(options, query),
    [options, query],
  );

  const toggleOption = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((item) => item !== code));
    } else {
      onChange([...selected, code]);
    }
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!query.trim()) {
      setOpen(false);
      setActiveIndex(0);
      return;
    }
    setOpen(true);
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (event) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) toggleOption(option.code);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handlePaste = (event) => {
    const pasted =
      event.clipboardData?.getData("text/plain") ||
      event.clipboardData?.getData("text") ||
      "";
    if (pasted) {
      const codes = resolvePastedCodes(pasted);
      if (codes.length === 0) return;

      event.preventDefault();
      const next = [...selected];
      const seen = new Set(selected);
      codes.forEach((code) => {
        if (!seen.has(code)) {
          next.push(code);
          seen.add(code);
        }
      });
      onChange(next);
      setQuery("");
      setOpen(false);
      setActiveIndex(0);
      return;
    }

    pasteFallbackRef.current = true;
    setTimeout(() => {
      if (!pasteFallbackRef.current) return;
      pasteFallbackRef.current = false;
      const value = event.target.value || "";
      const codes = resolvePastedCodes(value);
      if (codes.length === 0) return;

      const next = [...selected];
      const seen = new Set(selected);
      codes.forEach((code) => {
        if (!seen.has(code)) {
          next.push(code);
          seen.add(code);
        }
      });
      onChange(next);
      setQuery("");
      setOpen(false);
      setActiveIndex(0);
    }, 0);
  };

  const handleChange = (event) => {
    if (pasteFallbackRef.current) {
      pasteFallbackRef.current = false;
    }
    const value = event.target.value;
    if (/[,\n;\t]/.test(value)) {
      const codes = resolvePastedCodes(value);
      if (codes.length > 0) {
        const next = [...selected];
        const seen = new Set(selected);
        codes.forEach((code) => {
          if (!seen.has(code)) {
            next.push(code);
            seen.add(code);
          }
        });
        onChange(next);
        setQuery("");
        setOpen(false);
        setActiveIndex(0);
        return;
      }
    }
    setQuery(value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {onClear && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClear}
            disabled={clearDisabled}
            aria-label={clearLabel}
            title={clearLabel}
            className="border-border bg-background/70"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="rounded-md border border-border/70 bg-background/80 p-2">
        <div className="flex flex-wrap gap-2">
          {selected.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggleOption(code)}
              className="rounded-full bg-accent/70 px-3 py-1 text-xs text-accent-foreground hover:bg-accent"
            >
              {options.find((item) => item.code === code)?.name || code} (
              {code}) x
            </button>
          ))}
        </div>
        <Input
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
          onPaste={handlePaste}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          className="mt-2"
        />
      </div>
      {open && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border/70 bg-card shadow-lg shadow-orange-100/40">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matches found.
            </div>
          ) : (
            filtered.map((airport, index) => {
              const isSelected = selected.includes(airport.code);
              const isActive = index === activeIndex;
              return (
                <button
                  key={airport.code}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleOption(airport.code)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    isActive ? "bg-slate-100" : "hover:bg-slate-100"
                  } ${isSelected ? "font-medium" : ""}`}
                >
                  <span>
                    {airport.name} ({airport.code})
                  </span>
                  {isSelected && <span className="text-slate-400">Selected</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
