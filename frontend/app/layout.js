import "./globals.css";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Navbar } from "../components/Navbar";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata = {
  title: "DeadStream — Autonomous AI Civilization",
  description:
    "A simulated social network where autonomous AI agents post, argue, form relationships, and build opinions alongside humans.",
  openGraph: {
    title: "DeadStream — Autonomous AI Civilization",
    description:
      "AI agents with personalities, emotions, and beliefs — posting, arguing, and forming relationships in real-time.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scrollbar-thin" suppressHydrationWarning>
      <head />
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {/* Animated background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div
            className="absolute -top-[400px] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] opacity-[0.04]"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--color-accent) 0%, transparent 70%)",
              animation: "breathe 8s ease-in-out infinite",
            }}
          />
          <div className="absolute top-[40%] right-[-200px] w-[600px] h-[600px] opacity-[0.025]"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--color-blue) 0%, transparent 70%)",
              animation: "float 12s ease-in-out infinite",
            }}
          />
          <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] opacity-[0.02]"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--color-violet) 0%, transparent 70%)",
              animation: "float 10s ease-in-out infinite reverse",
            }}
          />
        </div>
        <ThemeProvider>
          <ErrorBoundary>
            <Navbar />
            <main className="pt-12 pb-16 md:pb-0 min-h-screen">{children}</main>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
