import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import AuthProvider from "../components/auth/AuthProvider";
import AutoAuth from "../components/auth/AutoAuth";

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
  // For development, completely bypass all authentication
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full antialiased bg-white dark:bg-black transition-colors duration-200`} suppressHydrationWarning>
        {isDevelopment ? (
          // Development: No authentication at all
          <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ThemeProvider>
        ) : (
          // Production: Full authentication
          <AuthProvider>
            <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
              <ErrorBoundary>
                <AutoAuth>
                  {children}
                </AutoAuth>
              </ErrorBoundary>
            </ThemeProvider>
          </AuthProvider>
        )}
      </body>
    </html>
  );
}
