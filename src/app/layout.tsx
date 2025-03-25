import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SonnerProvider } from "@/components/providers/SonnerProvider";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Regis Vault",
  description: "Secure Document Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <SonnerProvider />
      </body>
    </html>
  );
}
