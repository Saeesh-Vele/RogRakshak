import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  FileSearch,
  GitBranch,
  ListOrdered,
  Network,
  ScanText,
} from "lucide-react";

import { ContactTimeline } from "@/components/landing/contact-timeline";
import { ScoringWeights } from "@/components/landing/scoring-weights";
import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "RogRakshak | Trace hospital infection outbreaks in minutes",
  description:
    "RogRakshak reconstructs suspected transmission pathways for hospital-acquired infections from movement logs, staff contact and microbiology cultures — with deterministic, evidence-backed scoring.",
};

/**
 * Public marketing landing page. Deliberately not behind auth (see
 * src/middleware.ts): it is the entry point for /login. There is no
 * self-service sign-up — accounts are created by a developer.
 *
 * Visual direction: the page alternates between ink and clinical white. Ink
 * carries the two moments that are the product's actual argument — the temporal
 * contact chart and the scoring arithmetic — and the white sections carry the
 * reading. Type is Newsreader for display (its italic sets organism names, as
 * the domain does), IBM Plex Sans for body and IBM Plex Mono for anything that
 * is a record: case IDs, MRNs, timestamps, weights.
 *
 * Every claim here is grounded in what is actually built — the three-phase
 * pipeline and the scoring weights come from docs/DETECTION_ARCHITECTURE.md,
 * and the figures in the hero come from the shipped fixture case. No customer
 * logos, testimonials or usage numbers, because there are none.
 */

const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#scoring", label: "Scoring" },
];

const STEPS = [
  {
    icon: ScanText,
    phase: "Phase 2B",
    title: "Extract from lab reports",
    body: "Gemini multimodal vision reads microbiology PDFs and returns structured organism, resistance profile and antimicrobial susceptibility fields, validated against a Pydantic schema. It extracts only what is visible on the document — no inference, no filling in blanks.",
  },
  {
    icon: Network,
    phase: "Phase 3A",
    title: "Build the temporal graph",
    body: "Patient movements, staff shifts and ward stays become time-bounded contact events in Neo4j. Co-location, shared clinical attendants and specimen timing are modelled as discrete hops, so a pathway is a sequence of intervals — not a guess about who met whom.",
  },
  {
    icon: Calculator,
    phase: "Phase 3B",
    title: "Score deterministically",
    body: "A LangGraph workflow aggregates atomic evidence items and scores them on five fixed dimensions, then classifies the case from the total. The same evidence always produces the same number.",
  },
];

/**
 * Accent per feature card, from the graph node palette in globals.css, so the
 * marketing cards use the colours the product actually assigns to index cases,
 * wards, downstream contacts and the product blue — not a second decorative
 * palette. Tints are raised to /15 because they sit on ink, not on white.
 */
const FEATURES = [
  {
    icon: GitBranch,
    rail: "bg-node-location",
    chip: "bg-node-location/15 text-node-location",
    title: "Evidence you can audit to the record",
    body: "Every finding carries atomic evidence items with source record IDs, overlap durations, locations and timestamps. Nothing in a report exists without a row behind it that you can go and check.",
  },
  {
    icon: Network,
    rail: "bg-coral",
    chip: "bg-coral/15 text-coral",
    title: "Interactive transmission graph",
    body: "Chains render as an explorable graph of index patients, staff intermediaries and downstream contacts, with a per-case timeline of movements and positive cultures alongside it.",
  },
  {
    icon: ListOrdered,
    rail: "bg-node-downstream",
    chip: "bg-node-downstream/15 text-node-downstream",
    title: "A ranked cohort, not a contact list",
    body: "The workflow assembles the candidate cohort around an index patient and orders it by weighted score, so a review opens on the strongest pathway instead of an undifferentiated list of everyone who was nearby.",
  },
  {
    icon: FileSearch,
    // A lifted blue — the product's --primary is too dark to read on ink.
    rail: "bg-[#4C8DF6]",
    chip: "bg-[#4C8DF6]/15 text-[#83ACF7]",
    title: "Investigation dossiers on demand",
    body: "Point the workflow at an index patient and organism; it returns a full case dossier — cohort, evidence, scored dimensions, chain hypotheses and an executive briefing — through one REST call.",
  },
];

/** Small uppercase mono label that opens each section. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-white/45">
      <span className="h-px w-7 bg-white/25" />
      {children}
    </p>
  );
}

/** Eyebrow + display heading + optional lead, shared by every section. */
function SectionIntro({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-white sm:text-[2.625rem]">
        {title}
      </h2>
      {lead && (
        <p className="mt-5 max-w-2xl text-pretty text-[1.0625rem] leading-[1.7] text-white/55">
          {lead}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div
      // The marketing page is a fixed composition — it never follows the
      // signed-in theme, so it re-declares the light tokens for its subtree.
      data-theme="light"
      className="flex min-h-screen flex-col bg-ink font-body"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Hero — the ink instrument panel                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="bg-graph-dots-ink pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_25%,black,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.30),transparent_65%)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-[-8%] -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(249,115,98,0.16),transparent_65%)] blur-2xl"
        />

        {/* Nav */}
        <header className="relative z-10">
          <div className="mx-auto flex h-[76px] max-w-[1160px] items-center justify-between px-6">
            <Wordmark href="/" tone="light" />
            <nav className="flex items-center gap-1 sm:gap-2">
              <ul className="mr-2 hidden items-center gap-1 md:flex">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="rounded-lg px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link href="/login">
                <Button className="ring-offset-ink">Sign in</Button>
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-[1160px] px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
          <p className="animate-rise-in inline-flex items-center gap-2 rounded-full border border-ink-line bg-white/[0.04] px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Hospital-acquired infection surveillance
          </p>

          <h1
            className="animate-rise-in mt-6 max-w-4xl text-balance font-display text-[2.75rem] font-normal leading-[1.06] tracking-[-0.02em] text-white sm:text-[3.5rem] lg:text-[4.25rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Find <span className="italic text-coral">the chain</span> before the
            next culture comes back positive.
          </h1>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <p
              className="animate-rise-in max-w-2xl text-pretty text-[1.0625rem] leading-[1.65] text-white/60 sm:text-[1.125rem]"
              style={{ animationDelay: "0.16s" }}
            >
              RogRakshak fuses patient movement logs, staff shift rosters and
              microbiology cultures into a temporal graph, then scores every
              suspected pathway deterministically — with each figure traceable
              to the record it came from.
            </p>

            <div
              className="animate-rise-in flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.24s" }}
            >
              <Link href="/login">
                <Button size="lg" className="ring-offset-ink">
                  Sign in
                  <ArrowRight />
                </Button>
              </Link>
              <a
                href="#pipeline"
                className="inline-flex h-11 items-center rounded-lg border border-ink-line px-5 text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                How it works
              </a>
            </div>
          </div>

          {/* Signature: the temporal contact chart, from the fixture case */}
          <div className="mt-12 lg:mt-16">
            <ContactTimeline />
          </div>

          <p
            className="animate-rise-in mt-5 font-mono text-[0.6875rem] leading-relaxed text-white/50"
            style={{ animationDelay: "1.0s" }}
          >
            Accounts are provisioned by your infection control team. The demo
            runs on synthetic patient data.
          </p>
        </div>
      </section>

      {/*
        Everything below the hero lives on the same ink field. The page used to
        drop to white here and climb back to ink for the closing call, which
        read as three unrelated pages stapled together. One continuous dark
        canvas, varied by depth — recessed bands, lifted bands, glows and the
        dot grid — carries the whole scroll instead.
      */}
      <main className="flex-1 bg-ink">
        {/* -------------------------------------------------------------- */}
        {/* The problem — pure type. The breath after the hero.            */}
        {/* -------------------------------------------------------------- */}
        <section
          id="problem"
          className="relative isolate border-t border-ink-line"
        >
          <div className="mx-auto max-w-[1160px] px-6 py-24 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-20">
              <SectionIntro
                eyebrow="The problem"
                title={
                  <>
                    Drawn by hand, the chain takes longer to finish than the
                    outbreak takes to spread.
                  </>
                }
              />

              <div className="space-y-6 text-pretty text-[1.0625rem] leading-[1.75] text-white/55 lg:pt-3">
                <p>
                  When a resistant organism turns up on a ward, working out who
                  else was exposed means hand-reconciling admission, transfer
                  and discharge logs against nursing rosters and culture dates —
                  spreadsheet by spreadsheet, across weeks of movements.
                </p>
                <p>
                  A single index patient can generate hundreds of candidate
                  contacts once shared staff and shared rooms are counted, and
                  the links that matter are temporal: an overlap of a few hours,
                  three transfers ago.
                </p>
              </div>
            </div>

            {/* The consequence, given its own beat */}
            <p className="mt-16 border-t border-ink-line pt-10 text-balance font-display text-[1.5rem] font-normal leading-[1.4] text-white/85 sm:text-[1.875rem] lg:mt-20">
              By the time the chain is drawn by hand,{" "}
              <span className="italic text-coral">
                the next cases have already been admitted.
              </span>
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Pipeline — a real sequence, so it is numbered                  */}
        {/* -------------------------------------------------------------- */}
        <section
          id="pipeline"
          className="relative isolate overflow-hidden border-t border-ink-line"
        >
          {/* Lifted band, so the sequence reads as raised off the field */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/[0.035] via-white/[0.012] to-transparent"
          />
          <div
            aria-hidden
            className="bg-graph-dots-ink pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_20%,black,transparent)]"
          />

          <div className="mx-auto max-w-[1160px] px-6 py-24 lg:py-32">
            <SectionIntro
              eyebrow="How it works"
              title="Three phases, one pipeline."
              lead="The same pipeline that runs in the product — from a raw lab PDF to a scored, classified case."
              className="max-w-2xl"
            />

            <ol className="relative mt-20 grid gap-6 lg:grid-cols-3 lg:gap-7">
              {/* The run: a lit rule with a station above each phase */}
              <span
                aria-hidden
                className="absolute -top-10 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent lg:block"
              />
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span
                    aria-hidden
                    className="absolute -top-[46px] left-1 hidden h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(37,99,235,0.18),0_0_14px_2px_rgba(59,130,246,0.55)] lg:block"
                  />
                  <div className="group h-full rounded-2xl border border-ink-line bg-ink-panel p-7 transition-colors duration-300 hover:border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-[#83ACF7] transition-colors duration-300 group-hover:bg-primary/25">
                        <step.icon className="h-5 w-5" />
                      </span>
                      <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/50">
                        {step.phase}
                      </span>
                    </div>
                    <h3 className="mt-7 font-display text-[1.4375rem] font-normal leading-tight tracking-[-0.01em] text-white">
                      <span className="mr-2.5 align-[0.22em] font-mono text-[0.75rem] text-[#83ACF7]">
                        0{i + 1}
                      </span>
                      {step.title}
                    </h3>
                    <p className="mt-3.5 text-[0.9375rem] leading-[1.7] text-white/50">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* The compiled graph, written the way it is written in code */}
            <div className="mt-7 overflow-hidden rounded-2xl border border-ink-line bg-ink-panel">
              <p className="border-b border-ink-line px-5 py-3 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/45">
                Compiled LangGraph state machine
              </p>
              <div className="overflow-x-auto px-5 py-5">
                <p className="flex w-max items-center font-mono text-[0.8125rem]">
                  {[
                    "load_context",
                    "get_cohort",
                    "aggregate_evidence",
                    "score_evidence",
                    "build_chains",
                    "synthesize_summary",
                    "validate_output",
                  ].map((node, i, all) => (
                    <span key={node} className="flex items-center">
                      <span className="rounded-md border border-ink-line bg-white/[0.05] px-2 py-1.5 text-white/85">
                        {node}
                      </span>
                      {i < all.length - 1 && (
                        <span className="px-2 text-[#83ACF7]">→</span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
              <p className="border-t border-ink-line px-5 py-3.5 text-[0.875rem] leading-relaxed text-white/45">
                The final node rejects any output whose claims are not backed by
                referenced evidence.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Scoring — the arithmetic, beside the arithmetic                */}
        {/* -------------------------------------------------------------- */}
        <section
          id="scoring"
          className="relative isolate overflow-hidden border-t border-ink-line"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-[12%] top-1/4 -z-10 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_65%)] blur-2xl"
          />

          <div className="mx-auto max-w-[1160px] px-6 py-24 lg:py-32">
            <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
              <div>
                <SectionIntro
                  eyebrow="The score"
                  title="The confidence number is arithmetic, not opinion."
                />
                <div className="mt-6 max-w-xl space-y-5 text-pretty text-[1.0625rem] leading-[1.75] text-white/55">
                  <p>
                    Confidence is a weighted sum over five fixed dimensions. The
                    weights are set in the detection architecture and do not
                    move between cases, so the same evidence always yields the
                    same score and the breakdown is shown dimension by
                    dimension.
                  </p>
                  <p>
                    Language models do two jobs here: reading fields off lab
                    documents, and writing the briefing prose. They never touch
                    the risk arithmetic.
                  </p>
                  <p className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-white/50">
                    Shown: CASE-2026-001 · synthetic demonstration data
                  </p>
                </div>
              </div>

              <ScoringWeights />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* What you get                                                    */}
        {/* -------------------------------------------------------------- */}
        <section
          id="evidence"
          className="relative isolate overflow-hidden border-t border-ink-line"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white/[0.035] via-white/[0.012] to-transparent"
          />

          <div className="mx-auto max-w-[1160px] px-6 py-24 lg:py-32">
            <SectionIntro
              eyebrow="What you get"
              title="Hypotheses you can defend in a review meeting."
              lead="RogRakshak does not claim confirmed transmission. It surfaces suspected contact pathways and evidence-supported cluster hypotheses, and shows its working."
              className="max-w-2xl"
            />

            <div className="mt-16 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-2xl border border-ink-line bg-ink-panel p-7 transition-colors duration-300 hover:border-white/20"
                >
                  {/* Rail carries the colour, so the card keeps a hairline */}
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 left-0 w-[3px] ${feature.rail}`}
                  />
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${feature.chip}`}
                  >
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 font-display text-[1.4375rem] font-normal leading-tight tracking-[-0.01em] text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3.5 text-[0.9375rem] leading-[1.7] text-white/50">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Closing call + footer                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="relative isolate overflow-hidden border-t border-ink-line bg-ink">
        <div
          aria-hidden
          className="bg-graph-dots-ink pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_55%_70%_at_50%_35%,black,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-[460px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(59,130,246,0.18),transparent_65%)] blur-2xl"
        />

        <div className="mx-auto max-w-[1160px] px-6 py-28 text-center lg:py-36">
          {/* The chain, in miniature — index, attendant, downstream */}
          <span
            aria-hidden
            className="mx-auto flex w-fit items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-coral" />
            <span className="h-px w-10 bg-gradient-to-r from-coral to-node-location" />
            <span className="h-2 w-2 rounded-full bg-node-location" />
            <span className="h-px w-10 bg-gradient-to-r from-node-location to-node-downstream" />
            <span className="h-2 w-2 rounded-full bg-node-downstream" />
          </span>

          <h2 className="mx-auto mt-8 max-w-3xl text-balance font-display text-[2.125rem] font-normal leading-[1.12] tracking-[-0.015em] text-white sm:text-[3rem]">
            Open a case and follow the chain.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[1.0625rem] leading-[1.7] text-white/50">
            Sign in with the credentials your infection control team issued to
            reach the surveillance dashboard.
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/login">
              <Button size="lg" className="ring-offset-ink">
                Sign in
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-t border-ink-line">
          <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
            <Wordmark href="/" tone="light" />
            <p className="text-center font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-white/50 sm:text-right">
              HAI surveillance · Built for NexBuildOn Hack 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
