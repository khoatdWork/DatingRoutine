import type { MetadataRoute } from "next";
import { appConfig, appRoot } from "@/config/app";
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: appRoot,
    name: appConfig.fullName,
    short_name: appConfig.name,
    description: appConfig.description,
    lang: "vi",
    start_url: appRoot,
    scope: appRoot,
    display: "standalone",
    background_color: appConfig.backgroundColor,
    theme_color: appConfig.themeColor,
    icons: [
      { src: `${appRoot}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${appRoot}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: `${appRoot}icons/maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
