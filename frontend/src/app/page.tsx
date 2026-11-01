import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ContactTimeline } from "@/components/landing/contact-timeline";
import { ScoringWeights } from "@/components/landing/scoring-weights";
import { NetworkFigure } from "@/components/landing/network-figure";
import { ROLE_COLOR, OTHER_PATIENT_COUNT } from "@/components/landing/network-data";
import { Wordmark } from "@/components/layout/wordmark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "RogRakshak — Trace hospital infection outbreaks" },
  description:
    "RogRakshak reconstructs suspected transmission pathways for hospital-acquired infections from movement logs, staff contact and microbiology cultures, with deterministic, evidence-backed scoring.",
};

/**
 * Public landing page. Not behind auth (see src/middleware.ts): it is the
 * entry point for /login. There is no self-service sign-up.
 *
 * Every claim is checked against what is built. The pipeline phases and the
 * scoring weights come from docs/DETECTION_ARCHITECTURE.md and the backend;
 * every figure shown is CASE-2026-001 from the synthetic dataset. No logos,
 * testimonials or usage numbers, because there are none.
 */

const STEPS = [
  {
    phase: "Phase 2B",
    title: "Extract from lab reports",
    body: "Gemini multimodal vision reads microbiology PDFs and returns structured organism, resistance profile and antimicrobial susceptibility fields, validated against a Pydantic schema. It extracts only what is visible on the document: no inference, no filling in blanks.",
  },
  {
    phase: "Phase 3A",
    title: "Build the temporal graph",
    body: "Patient movements, staff shifts and ward stays become time-bounded contact events, computed from the movement and roster records and exported as a Neo4j graph. Co-location, shared attendants and specimen timing are discrete hops, so a pathway is a sequence of intervals rather than a guess about who met whom.",
  },
  {
    phase: "Phase 3B",
    title: "Score deterministically",
    body: "A LangGraph workflow aggregates atomic evidence items, scores them on five fixed dimensions and classifies the case from the total. The same evidence always produces the same number.",
  },
];

const WORKFLOW = [
  "load_context",
  "get_cohort",
  "aggregate_evidence",
  "score_evidence",
  "build_chains",
  "synthesize_summary",
  "validate_output",
];

const FEATURES = [
  {
    title: "Evidence you can audit",
    body: "Each finding is broken into atomic evidence items that name their source. Contact items carry the movement and shift record IDs they were computed from, with the overlap duration, location and timestamps.",
  },
  {
    title: "An interactive transmission graph",
    body: "Chains render as an explorable graph of index patients, staff intermediaries and downstream contacts, alongside the index patient's movement timeline and positive cultures.",
  },
  {
    title: "Contacts ranked by strength of link",
    body: "Candidates are ranked by evidence tier and total overlap with the index case, so a review opens on the strongest link instead of an undifferentiated list of everyone who was nearby.",
  },
  {
    title: "A case dossier from one request",
    body: "Point the workflow at an index patient and organism; one REST call returns the cohort, evidence, scored dimensions, chain hypotheses and a briefing.",
  },
];

const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#scoring", label: "Scoring" },
  { href: "#case", label: "The case" },
];

/** Ink-ruled section with its label in the left margin. */
function Section({
  id,
  label,
  title,
  children,
  lead,
}: {
  id: string;
  label: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mx-auto max-w-[1200px] scroll-mt-6 px-5 py-16 md:px-8 lg:py-24"
    >
      <div className="grid gap-x-10 gap-y-6 border-t border-foreground pt-5 lg:grid-cols-12">
        <p className="label-caps text-foreground lg:col-span-3">{label}</p>
        <div className="lg:col-span-9">
          <h2
            id={`${id}-title`}
            className="max-w-3xl text-balance font-display text-[1.875rem] font-normal leading-[1.15] tracking-[-0.015em] text-foreground sm:text-[2.375rem]"
          >
            {title}
          </h2>
          {lead && (
            <p className="mt-4 max-w-2xl text-pretty text-lead text-muted-foreground">
              {lead}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

const LEGEND = [
  { role: "index" as const, label: "Index patient", who: "Rajesh Verma" },
  { role: "staff" as const, label: "Shared attendant", who: "Nurse Anita Sharma" },
  {
    role: "downstream" as const,
    label: "Downstream cases",
    who: "Suresh Joshi, Meenakshi Rao, Tarun Agarwal",
  },
  {
    role: "other" as const,
    label: "Not linked",
    who: `The other ${OTHER_PATIENT_COUNT} patients on record`,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 md:px-8">
          <Wordmark href="/" />
          <nav aria-label="Sections" className="flex items-center gap-1">
            <ul className="mr-3 hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="rounded-md px-2.5 py-2 text-ui text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {/* ------------------------------------------------------------ */}
        {/* Hero                                                          */}
        {/* ------------------------------------------------------------ */}
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid max-w-[1200px] items-center gap-x-10 gap-y-8 px-5 pb-12 pt-10 md:px-8 lg:grid-cols-12 lg:pb-20 lg:pt-16"
        >
          <div className="lg:col-span-5">
            <p className="label-caps animate-rise-in">
              Hospital-acquired infection surveillance
            </p>
            <h1
              id="hero-title"
              className="animate-rise-in mt-4 text-balance font-display text-[2.5rem] font-normal leading-[1.05] tracking-[-0.025em] text-foreground sm:text-[3.25rem] lg:text-[3.5rem]"
              style={{ animationDelay: "0.06s" }}
            >
              Find <em>the chain</em> before the next culture comes back
              positive.
            </h1>
            <p
              className="animate-rise-in mt-6 max-w-xl text-pretty text-lead text-muted-foreground"
              style={{ animationDelay: "0.12s" }}
            >
              RogRakshak fuses patient movement logs, staff shift rosters and
              microbiology cultures into a temporal graph, then scores every
              suspected pathway deterministically, with each figure traceable
              to the record it came from.
            </p>
            <div
              className="animate-rise-in mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.18s" }}
            >
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Sign in
                <ArrowRight />
              </Link>
              <a href="#pipeline" className={buttonVariants({ size: "lg", variant: "outline" })}>
                How it works
              </a>
            </div>
            <p
              className="animate-rise-in mt-6 font-mono text-meta text-muted-foreground"
              style={{ animationDelay: "0.24s" }}
            >
              Accounts are provisioned by your infection control team. The demo
              runs on synthetic patient data.
            </p>
          </div>

          <figure className="lg:col-span-7" aria-labelledby="network-caption">
            <div className="relative">
              {/* The dot grid stands for the graph canvas — it is only used here */}
              <div
                aria-hidden
                className="bg-graph-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_50%,black,transparent)]"
              />
              <NetworkFigure />
            </div>
            <figcaption id="network-caption" className="border-t border-border pt-3">
              <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-mono text-meta text-foreground">CASE-2026-001</span>
                <span className="text-meta text-muted-foreground">
                  Three chains, each hop a 12-hour shift overlap · synthetic data
                </span>
              </p>
              <ul className="mt-2.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {LEGEND.map((l) => (
                  <li key={l.role} className="flex items-baseline gap-2 text-meta">
                    <span
                      aria-hidden
                      className="relative top-[1px] h-2 w-2 shrink-0 rounded-full"
                      style={{ background: ROLE_COLOR[l.role] }}
                    />
                    <span>
                      <span className="text-foreground">{l.label}</span>
                      <span className="text-muted-foreground"> · {l.who}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* The problem                                                   */}
        {/* ------------------------------------------------------------ */}
        <Section
          id="problem"
          label="The problem"
          title="Drawn by hand, the chain takes longer to finish than the outbreak takes to spread."
        >
          <div className="mt-8 grid gap-x-10 gap-y-5 lg:grid-cols-12">
            <div className="grid gap-x-10 gap-y-5 text-pretty text-copy leading-[1.75] text-muted-foreground sm:grid-cols-2 lg:col-span-9 lg:col-start-4">
              <p>
                When a resistant organism turns up on a ward, working out who
                else was exposed means hand-reconciling admission, transfer and
                discharge logs against nursing rosters and culture dates,
                spreadsheet by spreadsheet, across weeks of movements.
              </p>
              <p>
                A single index patient can generate hundreds of candidate
                contacts once shared staff and shared rooms are counted, and the
                links that matter are temporal: an overlap of a few hours, three
                transfers ago.
              </p>
            </div>
            <blockquote className="border-l-2 border-foreground pl-5 lg:col-span-9 lg:col-start-4">
              <p className="text-balance font-display text-[1.5rem] leading-[1.35] text-foreground sm:text-[1.75rem]">
                By the time the chain is drawn by hand,{" "}
                <em>the next cases have already been admitted.</em>
              </p>
            </blockquote>
          </div>
        </Section>

        {/* ------------------------------------------------------------ */}
        {/* Pipeline — a real sequence, so it is numbered                  */}
        {/* ------------------------------------------------------------ */}
        <Section
          id="pipeline"
          label="How it works"
          title="Three phases, one pipeline."
          lead="The same pipeline the product runs, from a raw lab PDF to a scored, classified case."
        >
          <ol className="mt-10 lg:ml-[25%]">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid gap-x-8 gap-y-2 border-t border-border py-7 sm:grid-cols-[4.5rem_1fr] lg:grid-cols-[4.5rem_minmax(0,0.9fr)_minmax(0,1.3fr)]"
              >
                <span
                  aria-hidden
                  className="font-display text-numeral leading-none text-muted-foreground"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-mono text-meta text-muted-foreground">
                    <span className="sr-only">Step {i + 1}, </span>
                    {step.phase}
                  </p>
                  <h3 className="mt-1 font-display text-title-sm text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="text-pretty text-copy leading-[1.7] text-muted-foreground sm:col-start-2 lg:col-start-3">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          {/* The compiled workflow, written the way it is written in code */}
          <div className="border-y border-border py-5 lg:ml-[25%]">
            <p className="label-caps">Compiled LangGraph workflow</p>
            <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2 font-mono text-meta">
              {WORKFLOW.map((node, i) => (
                <li key={node} className="flex items-center gap-1.5">
                  <span className="rounded-sm border border-border bg-card px-1.5 py-1 text-foreground">
                    {node}
                  </span>
                  {i < WORKFLOW.length - 1 && (
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-4 max-w-2xl text-ui text-muted-foreground">
              The last node checks the case is complete (an index patient and a
              scoring breakdown are present) and records any gap as a warning on
              the case rather than passing it silently.
            </p>
          </div>
        </Section>

        {/* ------------------------------------------------------------ */}
        {/* Scoring                                                       */}
        {/* ------------------------------------------------------------ */}
        <Section
          id="scoring"
          label="The score"
          title="The confidence number is arithmetic, not opinion."
        >
          <div className="mt-8 grid gap-x-10 gap-y-10 lg:grid-cols-12">
            <div className="space-y-5 text-pretty text-copy leading-[1.75] text-muted-foreground lg:col-span-4 lg:col-start-4">
              <p>
                Confidence is a weighted sum over five fixed dimensions. The
                weights are set in the detection architecture and do not move
                between cases, so the same evidence always yields the same
                score, and the breakdown is shown dimension by dimension.
              </p>
              <p>
                A language model has one job here: reading fields off lab
                documents. The briefing is assembled from the computed figures
                by a fixed template, and nothing generated touches the risk
                arithmetic.
              </p>
              <p className="font-mono text-meta">
                Shown: CASE-2026-001 · synthetic demonstration data
              </p>
            </div>
            <div className="lg:col-span-5">
              <ScoringWeights />
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------ */}
        {/* The same case, read in time                                   */}
        {/* ------------------------------------------------------------ */}
        <Section
          id="case"
          label="The case"
          title="The same case, read in time."
          lead="Who was where, which shifts overlapped and when each culture came back positive, on one axis. Every timestamp and duration is CASE-2026-001's."
        >
          <div className="mt-10 lg:ml-[25%]">
            <ContactTimeline />
          </div>
        </Section>

        {/* ------------------------------------------------------------ */}
        {/* What you get                                                  */}
        {/* ------------------------------------------------------------ */}
        <Section
          id="evidence"
          label="What you get"
          title="Hypotheses you can defend in a review meeting."
          lead="RogRakshak does not claim confirmed transmission. It surfaces suspected contact pathways and evidence-supported cluster hypotheses, and shows its working."
        >
          <dl className="mt-10 grid sm:grid-cols-2 lg:ml-[25%]">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "border-t border-border py-6",
                  i % 2 === 0 ? "sm:pr-8" : "sm:border-l sm:pl-8"
                )}
              >
                <dt className="font-display text-title-sm text-foreground">
                  {f.title}
                </dt>
                <dd className="mt-2 text-pretty text-copy leading-[1.7] text-muted-foreground">
                  {f.body}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* ------------------------------------------------------------ */}
        {/* Closing                                                       */}
        {/* ------------------------------------------------------------ */}
        <section
          aria-labelledby="closing-title"
          className="mx-auto max-w-[1200px] px-5 pb-20 pt-4 md:px-8 lg:pb-28"
        >
          <div className="border-t border-foreground pt-12 text-center">
            <h2
              id="closing-title"
              className="mx-auto max-w-2xl text-balance font-display text-[2rem] font-normal leading-[1.12] tracking-[-0.015em] text-foreground sm:text-[2.625rem]"
            >
              Open a case and follow the chain.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-lead text-muted-foreground">
              Sign in with the credentials your infection control team issued to
              reach the surveillance dashboard.
            </p>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg" }), "mt-8")}
            >
              Sign in
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 px-5 py-8 sm:flex-row sm:items-center md:px-8">
          <Wordmark href="/" />
          <p className="font-mono text-meta text-muted-foreground">
            HAI surveillance · Built for NexBuildOn Hack 2026 · Synthetic data only
          </p>
        </div>
      </footer>
    </div>
  );
}
