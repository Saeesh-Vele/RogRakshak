import type { Metadata } from "next";

/** The case ID is in the URL, so the tab title needs no data fetch. */
export function generateMetadata({
  params,
}: {
  params: { caseId: string };
}): Metadata {
  return { title: `${decodeURIComponent(params.caseId)} · Investigation` };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
