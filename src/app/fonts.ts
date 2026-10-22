import {
  Inter,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
  Playfair_Display,
} from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Devanagari faces are not preloaded: unicode-range means they download only when Hindi glyphs render.
const notoSansDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-sans-deva",
  display: "swap",
  preload: false,
});

const notoSerifDeva = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-serif-deva",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  playfair.variable,
  inter.variable,
  notoSansDeva.variable,
  notoSerifDeva.variable,
].join(" ");
