import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "HisChoir", template: "%s · HisChoir" },
    description: "Plan Sabbath worship songs, rehearsal notes, and YouTube playback in one focused workspace.",
    openGraph: {
      title: "HisChoir",
      description: "Sabbath worship, organized.",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "HisChoir Sabbath worship planning" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "HisChoir",
      description: "Sabbath worship, organized.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
