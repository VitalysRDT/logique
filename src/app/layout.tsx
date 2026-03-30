import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logique - Jeu Multijoueur",
  description: "Testez votre logique ! 100 questions du trivial a l'impossible.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
