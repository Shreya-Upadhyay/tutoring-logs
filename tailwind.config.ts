import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b8d1ff",
          300: "#8bb3ff",
          400: "#5b8dff",
          500: "#2f63f5",
          600: "#1f47d1",
          700: "#1c3aa8",
          800: "#1c3285",
          900: "#1b2d6b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
