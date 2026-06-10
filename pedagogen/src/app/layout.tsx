import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
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
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="h-full bg-background">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
