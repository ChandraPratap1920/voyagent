import type { Metadata } from "next";
import { TripProvider } from "@/context/TripContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voyagent — Your AI-powered travel begins here",
  description: "AI trip planning, booking, and itinerary tracking in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 font-sans">
        <TripProvider>{children}</TripProvider>
      </body>
    </html>
  );
}
