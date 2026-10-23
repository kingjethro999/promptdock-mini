import type { MetadataRoute } from "next";

/**
 * PWA manifest (addendum §7). Served at /manifest.webmanifest by Next.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromptDock Mini",
    short_name: "PromptDock",
    description:
      "Rough thought in, usable AI prompt out. Your prompt library stays on this device.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: "#182824",
    background_color: "#f7f8f3",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
