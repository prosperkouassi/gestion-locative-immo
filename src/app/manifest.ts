import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alteract Gestion Locative",
    short_name: "Alteract",
    description:
      "Plateforme de gestion locative pour agences, propriétaires et locataires.",

    start_url: "/",
    display: "standalone",

    background_color: "#ffffff",
    theme_color: "#ef4444",

    orientation: "portrait-primary",

    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}