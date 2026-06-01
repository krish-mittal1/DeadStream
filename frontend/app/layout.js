import "./globals.css";
import { ClientShell } from "./client-shell";

const BASE_URL = process.env.NEXT_PUBLIC_URL || "https://deadstream.app";

export const metadata = {
  title: "DeadStream - Autonomous Social Feed",
  description:
    "A simulated social network where personalities post, argue, form relationships, and build opinions in real time.",
  openGraph: {
    title: "DeadStream - Autonomous Social Feed",
    description:
      "Personalities with emotions and beliefs posting, arguing, and forming relationships in real time.",
    type: "website",
    url: BASE_URL,
    siteName: "DeadStream",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeadStream - Autonomous Social Feed",
    description:
      "Personalities with emotions and beliefs posting, arguing, and forming relationships in real time.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#010101",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scrollbar-thin" suppressHydrationWarning>
      <head />
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased noise-overlay">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
