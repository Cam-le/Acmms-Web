/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ─── Primary (teal) ──────────────────────────────────────────────
        // Derived from #009689. Use `bg-primary`, `text-primary`, etc.
        primary: {
          DEFAULT: "#009689", // base — most primary surfaces
          hover: "#007f75", // primary button hover
          dark: "#0f766e", // alt hover (rare; gộp với hover)
          fg: "#ffffff", // text on primary surfaces
          50: "#f0fdfa", // page accent bg, soft hover
          100: "#ccfbf1", // soft badge bg (soil compatibility, etc)
          200: "#99f6e4", // border on accent panels
          700: "#115e59", // heading color on primary panels
          800: "#0d3330", // strongest heading
          900: "#0a2522", // reserved
        },

        // ─── Surface / chrome ────────────────────────────────────────────
        surface: {
          DEFAULT: "#ffffff", // card bg
          alt: "#f8fafc", // table head, hover row, page bg
          subtle: "#f1f5f9", // tab strip bg, disabled bg
          page: "#f8fafc", // default page bg
        },

        // ─── Borders ─────────────────────────────────────────────────────
        // `border-border` for default, `border-border-strong` for inputs.
        border: {
          DEFAULT: "#e2e8f0", // default — cards, tables
          strong: "#cad5e2", // form input border
        },

        // ─── Text grey scale (mapped to Tailwind slate semantics) ────────
        ink: {
          DEFAULT: "#0f172a", // very rare; prefer slate-900
          900: "#0d3330", // strongest heading
          800: "#115e59", // most page headings
          700: "#334155", // body strong
          600: "#45556c", // form labels
          500: "#62748e", // body default
          400: "#94a3b8", // muted, placeholders
          300: "#cbd5e1", // very muted
        },

        // ─── Status badges ───────────────────────────────────────────────
        // Single canonical pair per tone; <StatusBadge tone="..." /> uses these.
        status: {
          "success-bg": "#dcfce7",
          "success-fg": "#008236", // unified from #166534 → #008236 (đa số)
          "warning-bg": "#fef9c3",
          "warning-fg": "#854d0e",
          "warning-bg-2": "#fef3c7", // for pending (Dashboard pill)
          "warning-fg-2": "#92400e",
          "danger-bg": "#fee2e2",
          "danger-fg": "#991b1b",
          "info-bg": "#dbeafe",
          "info-fg": "#1e40af",
          "neutral-bg": "#f1f5f9",
          "neutral-fg": "#475569",
        },
      },

      borderRadius: {
        card: "0.75rem", // 12px — cards, modal panels
        modal: "0.75rem", // 12px — alias
        btn: "0.5rem", // 8px — buttons, inputs
        pill: "9999px", // rounded-full alias
      },

      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        modal: "0 20px 40px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};
