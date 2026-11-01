"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" paints the confirm button red — for overwrites and deletes. */
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native <dialog> modal: the browser traps focus, makes the page behind it
 * inert and closes it on Escape. Initial focus goes to Cancel, so a stray
 * Enter never confirms an overwrite, and focus returns to whatever opened the
 * dialog when it closes.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      el.showModal();
      cancelRef.current?.focus();
    }
    if (!open && el.open) {
      el.close();
      returnFocus.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) dismisses
        if (e.target === ref.current) onCancel();
      }}
      className="w-[calc(100%-2rem)] max-w-[440px] rounded-lg border border-border bg-card p-0 text-card-foreground shadow-pop backdrop:bg-foreground/25"
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="font-display text-title-sm text-foreground"
        >
          {title}
        </h2>
        <div
          id={descId}
          className="mt-2 text-copy text-muted-foreground"
        >
          {description}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
