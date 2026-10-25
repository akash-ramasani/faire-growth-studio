import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif-display", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Growth Studio · Faire marketing engineering demo",
  description: "Self-serve agentic landing pages and audiences for marketers, with evals and a defined failure mode.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<div className="h-16 border-b border-line" />}>
          <Nav />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-cream">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
            <span>Growth Studio, an interview project by Akash Ramasani.</span>
            <span>Independent demo. Not affiliated with or endorsed by Faire. All retailer data is synthetic.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
