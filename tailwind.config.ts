import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f7f0df",
        ink: "#2f2a22",
        cinnabar: "#b75f4b",
        jade: "#5f8d78",
        lapis: "#486a8b",
        wheatline: "#e5d4b4"
      },
      boxShadow: {
        scroll: "0 12px 32px rgba(91, 69, 38, 0.15)"
      }
    }
  },
  plugins: []
};

export default config;
