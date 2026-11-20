import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import { appConfig, appRoot } from "@/config/app";
import { Providers } from "@/modules/app-shell/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: appConfig.fullName,
  description: appConfig.description,
  applicationName: appConfig.name,
  manifest: `${appRoot}manifest.webmanifest`,
  appleWebApp: { capable: true, title: appConfig.name, statusBarStyle: "default" },
  icons: { icon: `${appRoot}icon.svg`, apple: `${appRoot}icons/apple-touch-icon.png` },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: appConfig.themeColor,
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
