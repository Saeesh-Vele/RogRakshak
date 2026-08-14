"use client";

import type { InvestigationTimelineEntry } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  MapPin,
  Activity,
  FlaskConical,
  ArrowRight,
  User,
  FileText,
} from "lucide-react";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function EventIcon({ eventType }: { eventType: string }) {
  const t = eventType.toLowerCase();
  if (t.includes("admission") || t.includes("discharge"))
    return <ArrowRight className="w-3.5 h-3.5" />;
  if (t.includes("movement") || t.includes("transfer"))
    return <Activity className="w-3.5 h-3.5" />;
  if (t.includes("lab") || t.includes("culture") || t.includes("specimen"))
    return <FlaskConical className="w-3.5 h-3.5" />;
  if (t.includes("procedure")) return <FileText className="w-3.5 h-3.5" />;
  if (t.includes("contact") || t.includes("staff"))
    return <User className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

interface TimelineViewProps {
  entries: InvestigationTimelineEntry[];
}

export function TimelineView({ entries }: TimelineViewProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Investigation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No timeline events available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Investigation Timeline</CardTitle>
        <p className="text-xs text-slate-400">{sorted.length} events</p>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-800" />

          {sorted.map((entry, i) => (
            <div key={i} className="relative pb-4 last:pb-0">
              {/* Dot */}
              <div className="absolute -left-6 top-1 w-[9px] h-[9px] rounded-full border-2 border-teal-500 bg-slate-950" />

              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-teal-400">
                    <EventIcon eventType={entry.event_type} />
                  </div>
                  <span className="text-sm text-slate-200 font-medium">
                    {entry.event_type}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{entry.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {entry.patient_name}
                  </span>
                  {entry.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entry.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
