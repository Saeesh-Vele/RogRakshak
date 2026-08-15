"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog> modal — gives focus trapping, Esc-to-close and inertness of
 * the background for free, with no extra dependency.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) dismisses
        if (e.target === ref.current) onCancel();
      }}
      className="max-w-[440px] rounded-xl border border-border bg-card p-0 text-card-foreground shadow-pop backdrop:bg-foreground/30"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-risk-high">
            <AlertTriangle className="h-[18px] w-[18px] text-risk-high-foreground" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <div className="mt-1 text-[0.9375rem] leading-snug text-muted-foreground">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
