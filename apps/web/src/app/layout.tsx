import type { Metadata } from "next";
import { Archivo, EB_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";

// Archivo is a signage grotesque, which is what wall labels are set in.
const archivo = Archivo({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

// Rationed: the figure's name on reveal, and nothing else.
const ebGaramond = EB_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Dates, attempt counts, hint numerals. Tabular figures.
const geistMono = Geist_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Figurdle - Daily Famous Figure Guessing Game",
  description: "Guess the famous figure with daily hints. From history to entertainment, science to sports - a new puzzle every day!",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${ebGaramond.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
