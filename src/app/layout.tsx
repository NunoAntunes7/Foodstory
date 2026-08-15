import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoodStory Portal",
  description: "Pipeline, Key Figures, Logística, Financeira, Tarefas e Back Office"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
