import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import ApiHealthMonitorProvider from "../src/components/ApiHealthMonitorProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReportMate Fleet Dashboard",
  description: "Real-time fleet monitoring and event tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased bg-white dark:bg-black transition-colors duration-200`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
          <ErrorBoundary>
            <ApiHealthMonitorProvider />
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
