import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SonnerProvider } from "@/components/providers/SonnerProvider";
import { Providers } from "@/components/providers/Providers";
import { AppwriteProvider } from "@/providers/AppwriteProvider";
import { RegisvaultAssistant } from "@/components/assistant/RegisvaultAssistant";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AppwriteProvider>
            <RegisvaultAssistant>
              <Providers>
                {children}
              </Providers>
            </RegisvaultAssistant>
            <SonnerProvider />
          </AppwriteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}