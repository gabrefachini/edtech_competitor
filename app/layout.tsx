import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "competitive-digest",
  description: "Painel de inteligência competitiva"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
