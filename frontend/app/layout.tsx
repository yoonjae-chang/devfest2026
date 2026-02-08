import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Header from "@/components/tunetree/Header";
import "./globals.css";

function HeaderFallback() {
  return (
    <header className="bg-transparent">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
        <span className="text-xl font-semibold text-white drop-shadow-md">TuneTree</span>
        <nav className="ml-auto" aria-label="Main navigation" />
      </div>
    </header>
  );
}

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "TuneTree – Make any song you can imagine",
  description: "Describe your idea and let TuneTree generate music.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased text-gray-900`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Full-bleed background: public/background.jpg (or use background.gif for animated) */}
          <div
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-gray-900"
            style={{ backgroundImage: "url('/background.jpg')" }}
          />
          <div className="relative flex flex-col min-h-screen">
            <Suspense fallback={<HeaderFallback />}>
              <Header />
            </Suspense>
            <div className="flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
