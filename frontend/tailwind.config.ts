import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        sunken: "hsl(var(--sunken))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
          "soft-foreground": "hsl(var(--primary-soft-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        risk: {
          high: "hsl(var(--risk-high))",
          "high-foreground": "hsl(var(--risk-high-foreground))",
          medium: "hsl(var(--risk-medium))",
          "medium-foreground": "hsl(var(--risk-medium-foreground))",
          low: "hsl(var(--risk-low))",
          "low-foreground": "hsl(var(--risk-low-foreground))",
        },
        node: {
          infected: "hsl(var(--node-infected))",
          downstream: "hsl(var(--node-downstream))",
          location: "hsl(var(--node-location))",
          neutral: "hsl(var(--node-neutral))",
          "location-strong": "hsl(var(--node-location-strong))",
          patient: "hsl(var(--node-patient))",
          staff: "hsl(var(--node-staff))",
        },
      },
      fontFamily: {
        // Plex Sans is the default for all UI text; see src/app/layout.tsx.
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Iowan Old Style", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Small, consistent radii: 6px for objects, 4px for controls inside them.
      borderRadius: {
        xl: "calc(var(--radius) + 2px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 3px)",
      },
      // Elevation is reserved for things that float: menus, dialogs, toasts.
      boxShadow: {
        card: "none",
        "card-hover": "none",
        pop: "0 12px 32px -12px rgb(28 25 20 / 0.22), 0 2px 6px -2px rgb(28 25 20 / 0.08)",
      },
      /*
       * Type scale. Sizes are named for their job, so a page reads as a set of
       * roles rather than a list of pixel values.
       */
      fontSize: {
        eyebrow: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
        meta: ["0.75rem", { lineHeight: "1.125rem" }],
        ui: ["0.8125rem", { lineHeight: "1.25rem" }],
        copy: ["0.875rem", { lineHeight: "1.4rem" }],
        lead: ["1rem", { lineHeight: "1.6rem" }],
        "title-sm": ["1.25rem", { lineHeight: "1.6rem", letterSpacing: "-0.01em" }],
        title: ["1.875rem", { lineHeight: "2.2rem", letterSpacing: "-0.015em" }],
        numeral: ["2.75rem", { lineHeight: "1", letterSpacing: "-0.02em" }],
        display: ["3.5rem", { lineHeight: "1.04", letterSpacing: "-0.025em" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "none" },
        },
        /* Landing hero entry */
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
        "rise-in": "rise-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
