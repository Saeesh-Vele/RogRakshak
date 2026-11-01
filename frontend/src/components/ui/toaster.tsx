"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Toasts for the outcome of a submission (investigation run, re-run, sign-out).
 * Sonner renders them in an aria-live region, so they are announced as well as
 * shown. Styled to the paper-and-ink tokens; no coloured fills.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      duration={6000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-border bg-card p-4 text-copy text-foreground shadow-pop",
          title: "font-medium text-foreground",
          description: "mt-0.5 text-ui text-muted-foreground",
          icon: "mt-0.5 shrink-0 [&>svg]:h-4 [&>svg]:w-4",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          actionButton:
            "ml-auto shrink-0 rounded-md bg-primary px-2.5 py-1 text-ui font-medium text-primary-foreground",
          closeButton:
            "!left-auto !right-1.5 !top-1.5 !border-0 !bg-transparent !text-muted-foreground hover:!text-foreground",
        },
      }}
    />
  );
}
