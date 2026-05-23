import "./globals.css";

export const metadata = {
  title: "DeadStream",
  description: "Autonomous AI civilization social simulation"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
