import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import PwaRegistration from "@/components/PwaRegistration";
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
  title: "FinanzasApp",
  description: "Administra tus wallets, movimientos y decisiones de pago.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script id="remove-bis-attrs" strategy="beforeInteractive">
          {`
            (function () {
              var ATTR = 'bis_skin_checked';
              function clean() {
                try {
                  document.querySelectorAll('[' + ATTR + ']').forEach(function (el) {
                    el.removeAttribute(ATTR);
                  });
                } catch (e) {}
              }
              clean();
              var observer = new MutationObserver(function () { clean(); });
              observer.observe(document.documentElement, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: [ATTR],
              });
            })();
          `}
        </Script>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}

