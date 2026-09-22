import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/lib/ui/theme";

export const metadata: Metadata = {
  title: "Bitget rVue - rToken Research Desk",
  description:
    "Deterministic divergence scanner across the full Bitget rToken universe (tokenized U.S. stocks).",
  applicationName: "Bitget rVue",
  appleWebApp: { capable: true, title: "Bitget rVue", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080A0A" },
    { media: "(prefers-color-scheme: light)", color: "#F6F7F9" },
  ],
};

// Runs before first paint so the theme attribute is set with no flash.
// Resolution order: explicit choice (localStorage rvue.theme) ->
// prefers-color-scheme -> dark. ThemeProvider hydrates from this attribute.
// Defensive: make window.ethereum configurable so wallet browser extensions
// (Bitget Wallet vs MetaMask) don't crash with "Cannot redefine property".
const ethereumGuardScript =
  "(function(){try{var d=Object.getOwnPropertyDescriptor(window,'ethereum');" +
  "if(d&&!d.configurable){Object.defineProperty(window,'ethereum',{configurable:true,enumerable:true,get:d.get||function(){return d.value;},set:d.set||function(v){d.value=v;}});}}catch(e){}})();";

const themeInitScript =
  "(function(){var t=null;try{t=localStorage.getItem('rvue.theme');}catch(e){}" +
  "if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}" +
  "document.documentElement.setAttribute('data-theme',t);})();";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ethereumGuardScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div className="ambient" aria-hidden="true" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}