import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Ensure Tailwind is imported
import { METADATA } from "@/lib/metadata"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: METADATA.title,
  description: METADATA.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        {children}
      </body>
    </html>
  );
}