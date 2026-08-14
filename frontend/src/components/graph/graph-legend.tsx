"use client";

export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-xs text-xs">
      <div className="flex items-center gap-1.5 font-bold text-slate-700">
        <span>Legend:</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex size-4 items-center justify-center rounded bg-rose-600 text-white text-[9px] font-bold">
          P
        </span>
        <span className="text-[11px] text-slate-700 font-medium">Index Patient</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex size-4 items-center justify-center rounded bg-amber-500 text-white text-[9px] font-bold">
          P
        </span>
        <span className="text-[11px] text-slate-700 font-medium">Downstream Case</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex size-4 items-center justify-center rounded bg-teal-700 text-white text-[9px] font-bold">
          S
        </span>
        <span className="text-[11px] text-slate-700 font-medium">Vector Staff</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex size-4 items-center justify-center rounded bg-slate-300 text-slate-700 text-[9px] font-bold">
          W
        </span>
        <span className="text-[11px] text-slate-700 font-medium">Ward / Unit</span>
      </div>
      <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
        <span className="h-0.5 w-4 bg-rose-500 rounded" />
        <span className="text-[11px] text-rose-700 font-bold">High Overlap Contact</span>
      </div>
    </div>
  );
}
