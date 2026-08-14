"use client";

interface ConfidenceGaugeProps {
  confidence: number;
}

export function ConfidenceGauge({ confidence }: ConfidenceGaugeProps) {
  const pct = Math.round(confidence * 100);
  const circumference = 2 * Math.PI * 44;
  const filled = circumference * confidence;

  let color = "text-slate-500";
  let strokeColor = "stroke-slate-600";
  if (pct >= 85) {
    color = "text-amber-400";
    strokeColor = "stroke-amber-400";
  } else if (pct >= 70) {
    color = "text-orange-400";
    strokeColor = "stroke-orange-400";
  } else if (pct >= 40) {
    color = "text-blue-400";
    strokeColor = "stroke-blue-400";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28" role="img" aria-label={`Confidence: ${pct}%`}>
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            className="stroke-slate-800"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            className={strokeColor}
            strokeWidth="8"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400">Confidence</span>
    </div>
  );
}
