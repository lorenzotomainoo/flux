import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Lora, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Il font predefinito è precaricato; gli altri si scaricano solo se l'utente li sceglie (preload: false).
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-jakarta" });
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter", preload: false });
const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-grotesk", preload: false });
const serif = Lora({ subsets: ["latin"], display: "swap", variable: "--font-serif", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono", preload: false });

export const metadata: Metadata = {
  title: { default: "Flux", template: "%s · Flux" },
  description: "Il social network che scorre. Tutto dura 24 ore.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [jakarta, inter, grotesk, serif, mono].map((f) => f.variable).join(" ");
  return (
    <html lang="it" data-theme="dark" suppressHydrationWarning>
      <body className={`${jakarta.className} ${fontVars}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
