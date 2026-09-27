import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SmartAtelier · Votre atelier en inventaire",
  description: "Inventaire local de composants électroniques et de filaments 3D, à partir de photos et de vidéos.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
