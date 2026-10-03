import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeBoot } from "./theme-boot";
import { ThemeToggle } from "../components/ThemeToggle";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prompt Dock Mini",
  description: "Rough thought in, usable AI prompt out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeBoot />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <span className="text-sm font-extrabold tracking-tight text-green">
            Prompt Dock <span className="text-muted">Mini</span>
          </span>
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
