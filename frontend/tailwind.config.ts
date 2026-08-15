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
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
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
          patient: "hsl(var(--node-patient))",
          staff: "hsl(var(--node-staff))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        xl: "calc(var(--radius) + 4px)",
      },
      boxShadow: {
        // Deliberately soft — the mockups lean on hairline borders, not elevation
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.03)",
        "card-hover":
          "0 2px 6px -1px rgb(16 24 40 / 0.07), 0 1px 3px -1px rgb(16 24 40 / 0.04)",
        pop: "0 8px 24px -6px rgb(16 24 40 / 0.12), 0 2px 6px -2px rgb(16 24 40 / 0.06)",
      },
      fontSize: {
        // Small uppercase eyebrow used on stat cards and report rows
        eyebrow: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
