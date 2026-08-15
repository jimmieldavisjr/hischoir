import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Resolved from configuration rather than request headers so these pages can
 * be prerendered. Vercel supplies VERCEL_PROJECT_PRODUCTION_URL automatically.
 */
function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}

export function generateMetadata(): Metadata {
  return {
    metadataBase: siteUrl(),
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
