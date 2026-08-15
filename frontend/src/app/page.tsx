import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  FileSearch,
  GitBranch,
  Network,
  ScanText,
  Workflow,
} from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import { CasePreview } from "@/components/landing/case-preview";

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
 * Every claim here is grounded in what is actually built — the three-phase
 * pipeline and the scoring weights come from docs/DETECTION_ARCHITECTURE.md.
 * No customer logos, testimonials or usage numbers, because there are none.
 */

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
    body: "A LangGraph workflow aggregates atomic evidence items and scores them on five weighted dimensions — contact overlap 0.30, microbiological match 0.25, resistance phenotype 0.20, shared intermediary 0.15, specimen clustering 0.10 — then classifies the case from the total.",
  },
];

const FEATURES = [
  {
    icon: Calculator,
    title: "Deterministic scoring, not LLM guesswork",
    body: "The confidence number is a weighted sum over fixed dimensions. The same evidence always yields the same score, and the breakdown is shown dimension by dimension. Language models do extraction and briefing prose — never the risk arithmetic.",
  },
  {
    icon: GitBranch,
    title: "Evidence you can audit to the record",
    body: "Every finding carries atomic evidence items with source record IDs, overlap durations, locations and timestamps. Nothing in a report exists without a row behind it that you can go and check.",
  },
  {
    icon: Network,
    title: "Interactive transmission graph",
    body: "Chains render as an explorable graph of index patients, staff intermediaries and downstream contacts, with a per-case timeline of movements and positive cultures alongside it.",
  },
  {
    icon: FileSearch,
    title: "Investigation dossiers on demand",
    body: "Point the workflow at an index patient and organism; it returns a full case dossier — cohort, evidence, scored dimensions, chain hypotheses and an executive briefing — through one REST call.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-eyebrow font-semibold uppercase text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2rem]">
        {title}
      </h2>
      {children && (
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1160px] items-center justify-between px-6">
          <Wordmark href="/" />
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-[1160px] px-6 pb-16 pt-14 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[0.75rem] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Built for NexBuildOn Hack 2026
              </span>

              <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[3.25rem]">
                Trace hospital infection outbreaks{" "}
                <span className="text-primary">while they are still small</span>
              </h1>

              <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed text-muted-foreground">
                RogRakshak reconstructs suspected transmission pathways for
                hospital-acquired infections by fusing patient movement logs,
                staff contact and microbiology cultures into a temporal graph —
                then scores each pathway deterministically, with every figure
                traceable to a source record.
              </p>

              <div className="mt-8">
                <Link href="/login">
                  <Button size="lg">
                    Sign in
                    <ArrowRight />
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-[0.8125rem] text-muted-foreground">
                Accounts are provisioned by your infection control team. The demo
                runs on synthetic patient data.
              </p>
            </div>

            <div className="lg:justify-self-end lg:[perspective:1200px]">
              <CasePreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-[1160px] px-6 py-16 lg:py-20">
            <SectionHeading eyebrow="The problem" title="Manual contact tracing loses the race">
              When a resistant organism turns up on a ward, working out who else
              was exposed means hand-reconciling admission, transfer and
              discharge logs against nursing rosters and culture dates —
              spreadsheet by spreadsheet, across weeks of movements.
            </SectionHeading>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[1.0625rem] leading-relaxed text-muted-foreground">
              A single index patient can generate hundreds of candidate contacts
              once shared staff and shared rooms are counted, and the links that
              matter are temporal — an overlap of a few hours, three transfers
              ago. By the time the chain is drawn by hand, the next cases have
              already been admitted.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-[1160px] px-6 py-16 lg:py-24">
          <SectionHeading eyebrow="How it works" title="Three phases, one pipeline">
            The same pipeline that runs in the product — from raw lab PDF to a
            scored, classified case.
          </SectionHeading>

          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-[2rem] font-bold leading-none text-border">
                    {i + 1}
                  </span>
                </div>
                <p className="mt-5 text-eyebrow font-semibold uppercase text-muted-foreground">
                  {step.phase}
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
            <Workflow className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
              The workflow is a compiled LangGraph state machine —{" "}
              <span className="font-mono text-[0.8125rem] text-foreground">
                load_context → get_cohort → aggregate_evidence → score_evidence →
                build_chains → synthesize_summary → validate_output
              </span>{" "}
              — with a final validation node that rejects any output whose claims
              are not backed by referenced evidence.
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-[1160px] px-6 py-16 lg:py-24">
            <SectionHeading
              eyebrow="What you get"
              title="Hypotheses you can defend in a review meeting"
            >
              RogRakshak does not claim confirmed transmission. It surfaces
              suspected contact pathways and evidence-supported cluster
              hypotheses, and shows its working.
            </SectionHeading>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-background p-6"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1160px] px-6 py-16 lg:py-24">
          <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-card sm:px-12">
            <h2 className="text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2rem]">
              Open a case and follow the chain
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-muted-foreground">
              Sign in with the credentials your infection control team issued to
              reach the surveillance dashboard.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/login">
                <Button size="lg">
                  Sign in
                  <ArrowRight />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Wordmark href="/" />
          <p className="text-[0.8125rem] text-muted-foreground">
            Hospital-acquired infection surveillance · Built for NexBuildOn Hack
            2026
          </p>
        </div>
      </footer>
    </div>
  );
}
