import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        moss: "#3f6f58",
        clay: "#b46b45",
        linen: "#f5f0e8",
        sea: "#2d6f7f"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 33, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
