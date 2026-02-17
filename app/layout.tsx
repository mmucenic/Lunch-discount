import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canary Wharf Lunch Deals",
  description:
    "Find the best lunch deals, discount codes and offers near Canary Wharf, London.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
