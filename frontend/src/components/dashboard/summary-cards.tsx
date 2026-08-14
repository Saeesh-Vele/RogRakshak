"use client";

import { Users, AlertTriangle, GitFork, MapPin } from "lucide-react";
import { DashboardSummary } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: "Active Cases",
      value: summary.activeCasesCount,
      subtitle: `${summary.topOrganism.split(" ")[0]} dominant`,
      icon: Users,
      iconBg: "bg-blue-50 text-blue-600 border-blue-200",
      accentBorder: "hover:border-blue-300",
    },
    {
      title: "Potential Clusters",
      value: summary.potentialClustersCount,
      subtitle: "1 requiring immediate investigation",
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600 border-rose-200",
      accentBorder: "hover:border-rose-300 ring-1 ring-rose-200/70",
      highlight: true,
    },
    {
      title: "High-Priority Contacts",
      value: summary.highPriorityContactsCount,
      subtitle: "Staff & patient temporal crossovers",
      icon: GitFork,
      iconBg: "bg-amber-50 text-amber-600 border-amber-200",
      accentBorder: "hover:border-amber-300",
    },
    {
      title: "Flagged Locations",
      value: summary.flaggedLocationsCount,
      subtitle: summary.flaggedLocationsList.map((l) => l.name.split(" ")[0]).join(", "),
      icon: MapPin,
      iconBg: "bg-teal-50 text-teal-600 border-teal-200",
      accentBorder: "hover:border-teal-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`transition-all duration-200 shadow-xs ${card.accentBorder} ${
              card.highlight ? "bg-gradient-to-b from-rose-50/30 to-white" : "bg-white"
            }`}
          >
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-900 font-mono">
                    {card.value}
                  </span>
                  {card.highlight && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                      ACTION
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
                  {card.subtitle}
                </p>
              </div>
              <div className={`flex size-11 items-center justify-center rounded-xl border ${card.iconBg}`}>
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
