import type { Metadata } from "next";

// A plain-string title here would reset the root "%s — RogRakshak" template
// for the nested /new and /[caseId] routes, so it is restated.
export const metadata: Metadata = {
  title: { default: "Investigations", template: "%s — RogRakshak" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
