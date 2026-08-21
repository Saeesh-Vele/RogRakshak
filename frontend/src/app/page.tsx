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
 * Accent per feature card. Drawn from the graph node palette in globals.css
 * (teal / red / amber / blue) so the marketing cards use the same colours the
 * product does, rather than a second decorative palette.
 */
const FEATURES = [
  {
    icon: GitBranch,
    rail: "border-l-node-location",
    iconClass: "bg-node-location/10 text-node-location",
    title: "Evidence you can audit to the record",
    body: "Every finding carries atomic evidence items with source record IDs, overlap durations, locations and timestamps. Nothing in a report exists without a row behind it that you can go and check.",
  },
  {
    icon: Network,
    rail: "border-l-node-infected",
    iconClass: "bg-node-infected/10 text-node-infected",
    title: "Interactive transmission graph",
    body: "Chains render as an explorable graph of index patients, staff intermediaries and downstream contacts, with a per-case timeline of movements and positive cultures alongside it.",
  },
  {
    icon: ListOrdered,
    rail: "border-l-node-downstream",
    iconClass: "bg-node-downstream/10 text-node-downstream",
    title: "A ranked cohort, not a contact list",
    body: "The workflow assembles the candidate cohort around an index patient and orders it by weighted score, so a review opens on the strongest pathway instead of an undifferentiated list of everyone who was nearby.",
  },
  {
    icon: FileSearch,
    rail: "border-l-primary",
    iconClass: "bg-primary-soft text-primary-soft-foreground",
    title: "Investigation dossiers on demand",
    body: "Point the workflow at an index patient and organism; it returns a full case dossier — cohort, evidence, scored dimensions, chain hypotheses and an executive briefing — through one REST call.",
  },
];

/** Small uppercase mono label that opens each section. */
function Eyebrow({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "light";
}) {
  return (
    <p
      className={`flex items-center gap-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] ${
        tone === "light" ? "text-white/45" : "text-muted-foreground"
      }`}
    >
      <span
        className={`h-px w-6 ${tone === "light" ? "bg-white/25" : "bg-border"}`}
      />
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <div
      // The marketing page is a fixed composition — it never follows the
      // signed-in theme, so it re-declares the light tokens for its subtree.
      data-theme="light"
      className="flex min-h-screen flex-col bg-background font-body"
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
            className="animate-rise-in mt-5 font-mono text-[0.6875rem] leading-relaxed text-white/35"
            style={{ animationDelay: "1.0s" }}
          >
            Accounts are provisioned by your infection control team. The demo
            runs on synthetic patient data.
          </p>
        </div>
      </section>

      <main className="flex-1">
        {/* -------------------------------------------------------------- */}
        {/* The problem — quiet editorial counterweight to the hero        */}
        {/* -------------------------------------------------------------- */}
        <section id="problem" className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1160px] px-6 py-20 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
              <div>
                <Eyebrow>The problem</Eyebrow>
                <h2 className="mt-5 text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-foreground sm:text-[2.5rem]">
                  Drawn by hand, the chain takes longer to finish than the
                  outbreak takes to spread.
                </h2>
              </div>

              <div className="space-y-6 text-pretty text-[1.0625rem] leading-[1.7] text-muted-foreground lg:pt-2">
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
                <p className="border-l-2 border-coral pl-5 text-foreground">
                  By the time the chain is drawn by hand, the next cases have
                  already been admitted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Pipeline — a real sequence, so it is numbered                   */}
        {/* -------------------------------------------------------------- */}
        <section
          id="pipeline"
          className="relative isolate overflow-hidden border-b border-border"
        >
          <div
            aria-hidden
            className="bg-graph-dots pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
          />

          <div className="mx-auto max-w-[1160px] px-6 py-20 lg:py-28">
            <div className="max-w-2xl">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-foreground sm:text-[2.5rem]">
                Three phases, one pipeline.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted-foreground">
                The same pipeline that runs in the product — from a raw lab PDF
                to a scored, classified case.
              </p>
            </div>

            <ol className="relative mt-14 grid gap-6 lg:grid-cols-3 lg:gap-8">
              {/* The rule that makes the sequence read as one run */}
              <span
                aria-hidden
                className="absolute -top-7 left-0 right-0 hidden h-px bg-border lg:block"
              />
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span
                    aria-hidden
                    className="absolute -top-9 left-0 hidden h-4 w-4 rounded-full border-2 border-primary bg-background lg:block"
                  />
                  <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                        <step.icon className="h-[1.125rem] w-[1.125rem]" />
                      </span>
                      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {step.phase}
                      </span>
                    </div>
                    <h3 className="mt-6 font-display text-[1.375rem] font-normal leading-tight tracking-[-0.01em] text-foreground">
                      <span className="mr-2 font-mono text-[0.75rem] align-[0.2em] text-primary">
                        0{i + 1}
                      </span>
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[0.9375rem] leading-[1.65] text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {/* The compiled graph, written the way it is written in code */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              <p className="border-b border-border px-5 py-3 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
                Compiled LangGraph state machine
              </p>
              <div className="overflow-x-auto px-5 py-4">
                <p className="whitespace-nowrap font-mono text-[0.8125rem] text-foreground">
                  {[
                    "load_context",
                    "get_cohort",
                    "aggregate_evidence",
                    "score_evidence",
                    "build_chains",
                    "synthesize_summary",
                    "validate_output",
                  ].map((node, i, all) => (
                    <span key={node}>
                      <span className="rounded-md bg-muted px-1.5 py-1">
                        {node}
                      </span>
                      {i < all.length - 1 && (
                        <span className="px-1.5 text-primary">→</span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
              <p className="border-t border-border px-5 py-3 text-[0.875rem] leading-relaxed text-muted-foreground">
                The final node rejects any output whose claims are not backed by
                referenced evidence.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* Scoring — the second ink moment                                */}
        {/* -------------------------------------------------------------- */}
        <section id="scoring" className="relative isolate overflow-hidden bg-ink">
          <div
            aria-hidden
            className="bg-graph-dots-ink pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_30%_40%,black,transparent)]"
          />

          <div className="mx-auto max-w-[1160px] px-6 py-20 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
              <div>
                <Eyebrow tone="light">The score</Eyebrow>
                <h2 className="mt-5 text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-white sm:text-[2.5rem]">
                  The confidence number is arithmetic, not opinion.
                </h2>
                <div className="mt-6 max-w-xl space-y-5 text-pretty text-[1.0625rem] leading-[1.7] text-white/60">
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
                  <p className="font-mono text-[0.8125rem] leading-relaxed text-white/40">
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
        <section id="evidence" className="border-b border-border bg-card">
          <div className="mx-auto max-w-[1160px] px-6 py-20 lg:py-28">
            <div className="max-w-2xl">
              <Eyebrow>What you get</Eyebrow>
              <h2 className="mt-5 text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-foreground sm:text-[2.5rem]">
                Hypotheses you can defend in a review meeting.
              </h2>
              <p className="mt-4 text-[1.0625rem] leading-[1.7] text-muted-foreground">
                RogRakshak does not claim confirmed transmission. It surfaces
                suspected contact pathways and evidence-supported cluster
                hypotheses, and shows its working.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className={`rounded-2xl border border-l-[3px] border-border bg-background p-6 shadow-card transition-shadow duration-300 hover:shadow-card-hover ${feature.rail}`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl ${feature.iconClass}`}
                  >
                    <feature.icon className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <h3 className="mt-5 font-display text-[1.375rem] font-normal leading-tight tracking-[-0.01em] text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[0.9375rem] leading-[1.65] text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA + footer, back on ink                                */}
      {/* ---------------------------------------------------------------- */}
      <footer className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="bg-graph-dots-ink pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]"
        />

        <div className="mx-auto max-w-[1160px] px-6 py-20 text-center lg:py-28">
          <h2 className="mx-auto max-w-3xl text-balance font-display text-[2rem] font-normal leading-[1.14] tracking-[-0.015em] text-white sm:text-[2.75rem]">
            Open a case and follow the chain.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[1.0625rem] leading-[1.7] text-white/55">
            Sign in with the credentials your infection control team issued to
            reach the surveillance dashboard.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/login">
              <Button size="lg" className="ring-offset-ink">
                Sign in
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-t border-ink-line">
          <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-4 px-6 py-7 sm:flex-row">
            <Wordmark href="/" tone="light" />
            <p className="text-center font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-white/35 sm:text-right">
              HAI surveillance · Built for NexBuildOn Hack 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
