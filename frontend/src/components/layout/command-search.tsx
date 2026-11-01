"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

import { describeError } from "@/lib/api-client";
import { loadPatients, patientsFromCases } from "@/lib/patients";
import { useCasesStore } from "@/lib/cases-store";
import { useAppStore } from "@/lib/store";
import type { InvestigationCase, PatientListItem } from "@/types/api";
import { cn } from "@/lib/utils";

/**
 * Search across real cases and patients — nothing is suggested that the data
 * does not contain.
 *
 * Cases come from the shared case list. Patients come from GET /graph/patients
 * in live mode, or from the people inside the fixture case in mock mode. A
 * patient opens the case they appear in; a patient with no case offers to
 * start one, prefilled.
 *
 * Opens with / (outside text fields) or Cmd/Ctrl+K. Native <dialog> provides
 * the focus trap and Escape; the input is an ARIA combobox over a listbox.
 */

type Result =
  | { kind: "case"; key: string; href: string; case: InvestigationCase }
  | {
      kind: "patient";
      key: string;
      href: string;
      patient: PatientListItem;
      context: string;
    }
  | { kind: "filter"; key: string; href: string; query: string };

function caseForPatient(cases: InvestigationCase[], id: number) {
  const asIndex = cases.find((c) => c.index_patient.id === id);
  if (asIndex) return { c: asIndex, role: "Index" };
  const asContact = cases.find((c) => c.candidate_patients.some((p) => p.id === id));
  if (asContact) return { c: asContact, role: "Contact" };
  return null;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function CommandSearch() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  const mode = useAppStore((s) => s.mode);
  const { cases, status, load } = useCasesStore();

  const show = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    setQuery("");
    setActive(0);
    d.showModal();
    setOpen(true);
    inputRef.current?.focus();
  }, []);

  const hide = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Global shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing =
        t?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName ?? "");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        show();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  // Load what we search over, once opened
  useEffect(() => {
    if (!open) return;
    void load();
    if (mode === "mock") return;
    let cancelled = false;
    setPatientsError(null);
    loadPatients()
      .then((p) => !cancelled && setPatients(p))
      .catch((err) => !cancelled && setPatientsError(describeError(err)));
    return () => {
      cancelled = true;
    };
  }, [open, mode, load]);

  const results = useMemo<Result[]>(() => {
    const q = norm(query.trim());
    const pool = mode === "mock" ? patientsFromCases(cases) : patients ?? [];

    const caseHits = cases
      .filter(
        (c) =>
          !q ||
          [c.case_id, c.organism, c.resistance_profile, c.index_patient.name, c.index_patient.mrn]
            .some((f) => norm(f).includes(q))
      )
      .slice(0, q ? 6 : 5)
      .map<Result>((c) => ({
        kind: "case",
        key: `case-${c.case_id}`,
        href: `/investigations/${c.case_id}`,
        case: c,
      }));

    const patientHits: Result[] = q
      ? pool
          .filter((p) =>
            [p.name, p.mrn, p.latest_culture?.organism, String(p.id)].some((f) =>
              norm(f).includes(q)
            )
          )
          .slice(0, 8)
          .map((p) => {
            const linked = caseForPatient(cases, p.id);
            return {
              kind: "patient",
              key: `patient-${p.id}`,
              href: linked
                ? `/investigations/${linked.c.case_id}`
                : `/investigations/new?patient=${p.id}`,
              patient: p,
              context: linked
                ? `${linked.role} in ${linked.c.case_id}`
                : "No case yet · start investigation",
            };
          })
      : [];

    const filter: Result[] = q
      ? [
          {
            kind: "filter",
            key: "filter",
            href: `/investigations?q=${encodeURIComponent(query.trim())}`,
            query: query.trim(),
          },
        ]
      : [];

    return [...caseHits, ...patientHits, ...filter];
  }, [query, cases, patients, mode]);

  useEffect(() => setActive(0), [query]);

  function go(r: Result | undefined) {
    if (!r) return;
    hide();
    router.push(r.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home" && results.length) {
      setActive(0);
    } else if (e.key === "End" && results.length) {
      setActive(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const firstPatient = results.findIndex((r) => r.kind === "patient");
  const firstFilter = results.findIndex((r) => r.kind === "filter");
  const loadingCases = status === "loading" || status === "idle";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-keyshortcuts="/ Meta+K Control+K"
        aria-haspopup="dialog"
        className="flex h-9 w-full max-w-[380px] items-center gap-2.5 rounded-md border border-border bg-card px-3 text-left text-ui text-muted-foreground transition-colors hover:border-input max-sm:h-11"
      >
        <Search aria-hidden className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">
          Search cases and patients
        </span>
        <span aria-hidden className="hidden gap-1 sm:flex">
          <kbd className="kbd">/</kbd>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Search cases and patients"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) hide();
        }}
        className="mt-[12vh] w-[calc(100%-2rem)] max-w-[600px] overflow-hidden rounded-lg border border-border bg-card p-0 text-foreground shadow-pop backdrop:bg-foreground/20"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search by case ID, patient name, MRN or organism"
            placeholder="Case ID, patient, MRN or organism"
            className="h-12 flex-1 bg-transparent text-copy text-foreground outline-none placeholder:text-muted-foreground focus-visible:!outline-none"
          />
          <kbd className="kbd hidden sm:inline-grid">Esc</kbd>
        </div>

        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          <ul id={listId} role="listbox" aria-label="Results" className="py-1.5">
            {results.map((r, i) => (
              <li key={r.key} role="presentation">
                {i === 0 && r.kind === "case" && (
                  <p role="presentation" className="label-caps px-4 pb-1 pt-2">
                    {query.trim() ? "Cases" : "Recent cases"}
                  </p>
                )}
                {i === firstPatient && (
                  <p role="presentation" className="label-caps px-4 pb-1 pt-3">
                    Patients
                  </p>
                )}
                {i === firstFilter && i > 0 && (
                  <div role="presentation" className="mx-4 my-1.5 border-t border-border" />
                )}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2",
                    i === active && "bg-sunken"
                  )}
                >
                  {r.kind === "case" && (
                    <>
                      <span className="w-[120px] shrink-0 font-mono text-meta text-foreground">
                        {r.case.case_id}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ui text-muted-foreground">
                        <span className="text-foreground">{r.case.index_patient.name}</span>
                        {" · "}
                        <span className="italic">{r.case.organism}</span>
                        {r.case.resistance_profile && ` ${r.case.resistance_profile}`}
                      </span>
                    </>
                  )}
                  {r.kind === "patient" && (
                    <>
                      <span className="w-[120px] shrink-0 font-mono text-meta text-muted-foreground">
                        {r.patient.mrn}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ui text-foreground">
                        {r.patient.name}
                        {r.patient.latest_culture && (
                          <span className="text-muted-foreground">
                            {" · "}
                            <span className="italic">{r.patient.latest_culture.organism}</span>
                          </span>
                        )}
                      </span>
                      <span className="hidden shrink-0 text-meta text-muted-foreground sm:block">
                        {r.context}
                      </span>
                    </>
                  )}
                  {r.kind === "filter" && (
                    <span className="flex flex-1 items-center gap-2 text-ui text-primary">
                      <ArrowRight aria-hidden className="h-4 w-4" />
                      Filter investigations for “{r.query}”
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-ui text-muted-foreground">
              {loadingCases
                ? "Loading cases…"
                : query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : "No investigations yet."}
            </p>
          )}
          {patientsError && mode === "live" && query.trim() && (
            <p className="border-t border-border px-4 py-2.5 text-meta text-muted-foreground">
              Patient directory unavailable: {patientsError}
            </p>
          )}
        </div>

        <p
          aria-live="polite"
          className="sr-only"
        >
          {open && query.trim()
            ? `${results.length} result${results.length === 1 ? "" : "s"}`
            : ""}
        </p>
      </dialog>
    </>
  );
}
