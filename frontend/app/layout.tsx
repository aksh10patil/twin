import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rajdeep Patil — AI Digital Twin",
  description: "Interactive AI Twin of Rajdeep Patil. Inquire about background, technical skills, architecture, and projects.",
  icons: {
    icon: [
      { url: "/twin/icon.svg", type: "image/svg+xml" },
      { url: "/twin/favicon.ico", sizes: "any" },
    ],
    apple: "/twin/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
