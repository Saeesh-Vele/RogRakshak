"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { PatientListItem } from "@/types/api";
import { caseIdFor } from "@/lib/patients";
import { cn } from "@/lib/utils";

/**
 * Searchable index-patient picker over the real patient directory.
 *
 * ARIA combobox (input + listbox): type to filter by name, MRN, id or
 * organism; ArrowUp/Down/Home/End move; Enter picks; Escape closes. Each
 * option shows the patient's MRN, their latest culture, and whether they
 * already have a case (which a run would replace).
 */

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function cultureLine(p: PatientListItem) {
  const c = p.latest_culture;
  if (!c) return "No culture on record";
  return `${c.organism}${c.resistance_profile ? ` ${c.resistance_profile}` : ""} · ${fmtDay(c.collected_at)}`;
}

export function PatientPicker({
  id,
  patients,
  value,
  onChange,
  caseIds,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  patients: PatientListItem[];
  value: PatientListItem | null;
  onChange: (p: PatientListItem) => void;
  /** Case IDs that already exist, to flag patients a run would overwrite. */
  caseIds: Set<string>;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...patients]
      // Patients with a culture first — they are the plausible index cases
      .sort((a, b) => Number(!a.latest_culture) - Number(!b.latest_culture) || a.id - b.id)
      .filter(
        (p) =>
          !q ||
          [p.name, p.mrn, String(p.id), p.latest_culture?.organism ?? ""].some((f) =>
            f.toLowerCase().includes(q)
          )
      );
  }, [patients, query]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  function pick(p: PatientListItem | undefined) {
    if (!p) return;
    onChange(p);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home" && open) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open) {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const display = open ? query : value ? `${value.name} · ${value.mrn}` : "";

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        value={display}
        placeholder="Search by name, MRN or organism"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-card pl-9 pr-9 text-copy text-foreground placeholder:text-muted-foreground max-sm:h-11",
          "focus-visible:border-primary aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <ul
        id={listId}
        role="listbox"
        aria-label="Patients"
        hidden={!open}
        className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-80 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-pop"
      >
        {options.length === 0 && (
          <li role="presentation" className="px-3 py-3 text-ui text-muted-foreground">
            No patient matches “{query.trim()}”.
          </li>
        )}
        {options.map((p, i) => {
          const existing = caseIds.has(caseIdFor(p.id)) ? caseIdFor(p.id) : null;
          return (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={value?.id === p.id}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => setActive(i)}
              onClick={() => pick(p)}
              className={cn(
                "grid min-h-11 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2",
                i === active && "bg-sunken"
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-ui font-medium text-foreground">{p.name}</span>
                <span className="block truncate text-meta text-muted-foreground">
                  <span className="font-mono">{p.mrn}</span> ·{" "}
                  <span className={p.latest_culture ? "italic" : undefined}>{cultureLine(p)}</span>
                </span>
              </span>
              {existing && (
                <span className="font-mono text-[0.6875rem] text-muted-foreground">Has {existing}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {open ? `${options.length} patient${options.length === 1 ? "" : "s"} listed` : ""}
      </p>
    </div>
  );
}
