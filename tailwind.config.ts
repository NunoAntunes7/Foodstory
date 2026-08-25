import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F1EFFE",
          100: "#E1DCFD",
          400: "#7C6EF0",
          500: "#5B4CE0",
          600: "#4636C4"
        },
        status: {
          ganho: "#0F9D58",
          ganhoBg: "#E3F6EB",
          boa: "#E8930C",
          boaBg: "#FDF1DD",
          analise: "#2F6FED",
          analiseBg: "#E7EFFE",
          perdido: "#D93A3A",
          perdidoBg: "#FCEAEA"
        }
      },
      borderRadius: {
        xl: "14px"
      }
    }
  },
  plugins: []
};

export default config;
