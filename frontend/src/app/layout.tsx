import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EatSmart — Mess Credit Tracker & Meal Suggestor",
  description: "Track monthly mess wallet credits, get personalized meal suggestions, and optimize daily spending.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
