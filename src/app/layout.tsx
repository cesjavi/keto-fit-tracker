import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KetoFit · Personal Training & Nutrition Tracker",
  description: "Training, keto nutrition, and wellness habits in one place",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "KetoFit" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#142b24",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
