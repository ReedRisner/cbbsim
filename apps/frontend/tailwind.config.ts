import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: "#f59e0b",
        arena: "#0f172a",
      },
    },
  },
  plugins: [],
} satisfies Config;
