import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEDAGOGEN — Assistant Pédagogique IA",
  description: "Générateur de documents pédagogiques pour enseignants du collège marocain (1AC, 2AC, 3AC)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="h-full bg-background">
        <div className="flex h-full">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-full">
            <TopBar />
            <main className="flex-1 p-4 lg:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
