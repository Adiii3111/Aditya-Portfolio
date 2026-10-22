import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aditya Kadlabal Sripad — Engineer, Researcher, Analyst",
  description:
    "From Bengaluru to Boston — Aditya Kadlabal Sripad connects engineering, healthcare, supply chains, analytics, and research.",
};

export const viewport: Viewport = { themeColor: "#0B1423" };

// Runs before first paint: skip the opening sequence for returning visitors
// in this tab session and for anyone who prefers reduced motion.
const introScript = `try{if(sessionStorage.getItem("aks-intro")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="done"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
