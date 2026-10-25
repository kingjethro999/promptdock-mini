import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeBoot } from "./theme-boot";

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
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeBoot />
      </head>
      <body className="h-full overflow-hidden font-sans">
        {children}
      </body>
    </html>
  );
}
