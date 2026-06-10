import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#fdfdfd",
        surface: "#ffffff",
        surface2: "#f6f7f8",
        surface3: "#f3f4f6",
        text: "#17191c",
        muted: "#5d6675",
        primary: "#b971e0",
        secondary: "#ffaf0a",
        outline: "#cad3e0",
        info: "#0061a4",
        success: "#006e1c",
        warning: "#ffbf00",
        critical: "#bb1614"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23,25,28,.08)",
        card: "0 10px 30px rgba(23,25,28,.06)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem"
      }
    }
  },
  plugins: []
};

export default config;
