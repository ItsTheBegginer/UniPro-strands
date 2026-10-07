import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "./components/Navigation";
import { Header } from "./components/Header";

export const metadata: Metadata = {
  title: "UniPro — AI University Application Assistant",
  description: "Create your profile once, apply to multiple universities with AI intelligence and full human decision control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full bg-[#090d16] text-slate-100 antialiased flex overflow-hidden">
        <Navigation />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          <Header />
          <main className="flex-1 p-6 space-y-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
