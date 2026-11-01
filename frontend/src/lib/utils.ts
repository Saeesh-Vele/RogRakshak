import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge has to be told about the custom type scale in
 * tailwind.config.ts; otherwise it reads `text-ui` as a text *colour* and drops
 * it whenever a real colour class such as `text-foreground` follows.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["eyebrow", "meta", "ui", "copy", "lead", "title-sm", "title", "numeral", "display"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
