import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Open stand-ins for Faire's licensed Graphik (sans) and Nantes (serif).
const serif = Newsreader({ variable: "--font-serif-display", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "Growth Studio · Faire marketing engineering demo",
  description: "Self-serve agentic landing pages and audiences for marketers, with evals and a defined failure mode.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<div className="h-[142px] border-b border-line" />}>
          <Nav />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
