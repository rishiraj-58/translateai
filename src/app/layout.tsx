import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";
import "./polyfills";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TranslateAI - AI-Powered Document Translation",
  description: "Translate PDF and Word documents from any language to English using advanced AI technology. Supports large documents with automatic chunking and optimization.",
  keywords: "document translation, PDF translation, Word translation, AI translation, language translation",
  authors: [{ name: "TranslateAI" }],
  openGraph: {
    title: "TranslateAI - AI-Powered Document Translation",
    description: "Translate documents from any language to English with AI technology",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
