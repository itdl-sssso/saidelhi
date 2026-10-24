import type { MetadataRoute } from "next";

// Colours: design-system/tokens/colors.css (--blue-700 = surface-inverse, --cream = surface-page).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sri Sathya Sai Seva Organisation, Delhi NCR",
    short_name: "SSSSO Delhi NCR",
    description: "Bhajans, study circles, Bal Vikas and seva across Delhi NCR. Open to everyone, free always.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#164A5F",
    icons: [
      { src: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
