import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { NetworkFigure } from "@/components/landing/network-figure";
import { ROLE_COLOR, OTHER_PATIENT_COUNT } from "@/components/landing/network-data";
import { PipelineDiagram } from "@/components/landing/pipeline-diagram";
import { ChainStory } from "@/components/landing/chain-story";
import { CountUp } from "@/components/landing/count-up";
import { ProductShowcase } from "@/components/landing/product-showcase";
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
 * Rhythm: paper hero → white pipeline band → full-width ink story with the
 * case's numbers → sunken product showcase → ink-blue close. Every figure on
 * the page is CASE-2026-001 from the synthetic dataset, checked against the
 * live API. No logos, testimonials or usage numbers, because there are none.
 */

const NAV = [
  { href: "#pipeline", label: "Pipeline" },
  { href: "#case", label: "The case" },
  { href: "#product", label: "Product" },
];

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

const FIGURES = [
  { value: 0.964, decimals: 3, label: "Weighted confidence", sub: "Suspected cluster", risk: true },
  { value: 12, suffix: "h", label: "Overlap on every hop", sub: "720 minutes, three times over" },
  { value: 5, label: "Weighted dimensions", sub: "Fixed for every case" },
  { value: 15, label: "Evidence items", sub: "Behind the score" },
];

function SectionHead({
  id,
  label,
  title,
  sub,
  tone = "paper",
}: {
  id: string;
  label: string;
  title: string;
  sub?: string;
  tone?: "paper" | "ink";
}) {
  const ink = tone === "ink";
  return (
    <div className="max-w-3xl">
      <p className={cn("label-caps", ink ? "text-white/70" : "text-primary")}>{label}</p>
      <h2
        id={id}
        className={cn(
          "mt-3 text-balance font-display text-[2.25rem] font-normal leading-[1.06] tracking-[-0.02em] sm:text-[3rem] lg:text-[3.5rem]",
          ink ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {sub && (
        <p className={cn("mt-4 max-w-xl text-lead", ink ? "text-white/75" : "text-muted-foreground")}>
          {sub}
        </p>
      )}
    </div>
  );
}

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
              suspected pathway deterministically, with every finding linked to
              its source evidence.
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
        {/* Pipeline — draws itself on scroll                             */}
        {/* ------------------------------------------------------------ */}
        <section
          id="pipeline"
          aria-labelledby="pipeline-title"
          className="scroll-mt-4 border-y border-border bg-card"
        >
          <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 lg:py-28">
            <SectionHead
              id="pipeline-title"
              label="How it works"
              title="From a lab PDF to a score."
              sub="One case, end to end. Gemini reads the PDF; everything after it is deterministic."
            />
            <div className="mt-12 lg:mt-16">
              <PipelineDiagram />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* The case — scroll story and the numbers, on ink               */}
        {/* ------------------------------------------------------------ */}
        <section
          id="case"
          aria-labelledby="case-title"
          className="scroll-mt-4 bg-foreground text-white"
        >
          <div className="mx-auto max-w-[1200px] px-5 pt-20 md:px-8 lg:pt-28">
            <SectionHead
              id="case-title"
              tone="ink"
              label="The case"
              title="By hand, the chain takes longer than the outbreak. Here it is in four steps."
            />
            <div className="mt-6 lg:mt-0">
              <ChainStory />
            </div>
          </div>

          <div className="border-t border-white/15">
            <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-12 px-5 py-16 md:px-8 lg:grid-cols-4 lg:py-24">
              {FIGURES.map((f) => (
                <div key={f.label} className="border-l border-white/20 pl-5">
                  <dt className="label-caps text-white/70">{f.label}</dt>
                  <dd className="mt-3">
                    <CountUp
                      value={f.value}
                      decimals={f.decimals}
                      suffix={f.suffix}
                      className={cn(
                        "block font-display text-[3.25rem] leading-none tracking-[-0.03em] sm:text-[4.5rem] lg:text-[5.25rem]",
                        // Risk red, lifted to hold 7:1 on ink — it marks the cluster call
                        f.risk ? "text-[hsl(0_88%_72%)]" : "text-white"
                      )}
                    />
                    <span className="mt-3 block text-ui text-white/70">{f.sub}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* The real product                                              */}
        {/* ------------------------------------------------------------ */}
        <section
          id="product"
          aria-labelledby="product-title"
          className="scroll-mt-4 overflow-hidden border-b border-border bg-sunken"
        >
          <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 lg:py-28">
            <SectionHead
              id="product-title"
              label="The product"
              title="Hypotheses you can defend."
              sub="Real screens, rendering CASE-2026-001. Suspected pathways for review, never claimed as confirmed transmission."
            />
            <div className="mt-12 lg:mt-16">
              <ProductShowcase />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Close                                                         */}
        {/* ------------------------------------------------------------ */}
        <section aria-labelledby="closing-title" className="bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-end md:px-8 lg:py-20">
            <div>
              <h2
                id="closing-title"
                className="max-w-xl text-balance font-display text-[2.25rem] font-normal leading-[1.06] tracking-[-0.02em] sm:text-[3rem]"
              >
                Open a case. Follow the chain.
              </h2>
              <p className="mt-3 text-copy text-white/80">
                Accounts are issued by your infection control team.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-white px-5 text-copy font-medium text-primary transition-colors hover:bg-white/90"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer>
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
