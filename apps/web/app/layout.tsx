import type { Metadata } from "next";
import { Manrope, Noto_Sans_Bengali } from "next/font/google";
import { APP_NAME } from "@mms/shared";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

async function getPublicSite() {
  return fetch(`${apiBaseUrl}/api/public/site`, {
    next: { revalidate: 60 }
  })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
}

async function getPublicNavigation() {
  return fetch(`${apiBaseUrl}/api/public/navigation`, {
    next: { revalidate: 15 }
  })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite();
  const website = site?.website as
    | {
        siteTitle?: string;
        faviconUrl?: string | null;
        metaKeywords?: string | null;
        metaDescription?: string | null;
      }
    | undefined;

  return {
    title: {
      default: website?.siteTitle ?? APP_NAME,
      template: `%s | ${website?.siteTitle ?? APP_NAME}`
    },
    description: website?.metaDescription ?? "Single-organization membership management system",
    keywords: website?.metaKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    icons: website?.faviconUrl ? { icon: website.faviconUrl } : undefined
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [site, navigation] = await Promise.all([getPublicSite(), getPublicNavigation()]);
  const website = site?.website as
    | {
        siteTitle?: string;
        websiteSubtitle?: string | null;
        logoUrl?: string | null;
      }
    | undefined;
  const organization = site?.organization as { name?: string } | undefined;

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${notoSansBengali.variable}`}>
        <AppShell
          initialWebsiteNav={navigation?.items?.filter(
            (item: { key?: string; href?: string }) =>
              item.key !== "verify" && item.href !== "/verify"
          )}
          initialWebsiteIdentity={{
            siteTitle: website?.siteTitle || organization?.name || APP_NAME,
            websiteSubtitle:
              website?.websiteSubtitle || "সাস্ট সমাজবিজ্ঞান অ্যালামনাই অ্যাসোসিয়েশন",
            logoUrl: website?.logoUrl ?? null
          }}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
