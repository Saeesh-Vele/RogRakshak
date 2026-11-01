"use client";

import { useEffect, useState } from "react";

/** Below this width the interactive graph is too small to read; tables lead. */
export const GRAPH_TABLE_BELOW_PX = 768;

/**
 * Graph-or-table view state for the transmission graph sections.
 *
 * Phones (< 768px) start on the table view, which carries every node and hop
 * and needs no panning; the toggle still switches to the interactive graph.
 * Wider screens start on the graph, as before.
 *
 * The server cannot know the viewport, so the choice is made after mount
 * (`resolved`): rendering either view first and swapping would flash, and
 * guessing during render would fail hydration. Callers hold the space with a
 * placeholder until `resolved` is true.
 */
export function useGraphView() {
  const [asTable, setAsTable] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setAsTable(window.matchMedia(`(max-width: ${GRAPH_TABLE_BELOW_PX - 1}px)`).matches);
    setResolved(true);
  }, []);

  return { asTable, setAsTable, resolved };
}
