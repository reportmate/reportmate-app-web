import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import AuthProvider from "../components/auth/AuthProvider";
import AutoAuth from "../components/auth/AutoAuth";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[Theme Init] Starting theme initialization...');
                
                function getStoredTheme() {
                  try {
                    const stored = localStorage.getItem('reportmate-theme') || localStorage.getItem('theme');
                    console.log('[Theme Init] Stored theme:', stored);
                    return stored;
                  } catch (e) {
                    console.log('[Theme Init] Failed to read localStorage:', e);
                    return null;
                  }
                }
                
                function getSystemTheme() {
                  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    console.log('[Theme Init] System prefers dark mode');
                    return 'dark';
                  }
                  console.log('[Theme Init] System prefers light mode');
                  return 'light';
                }
                
                function setTheme(theme) {
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  
                  if (theme === 'system') {
                    const systemTheme = getSystemTheme();
                    root.classList.add(systemTheme);
                    console.log('[Theme Init] Applied system theme:', systemTheme);
                  } else {
                    root.classList.add(theme);
                    console.log('[Theme Init] Applied stored theme:', theme);
                  }
                }
                
                const storedTheme = getStoredTheme();
                const finalTheme = storedTheme || 'system';
                console.log('[Theme Init] Final theme to apply:', finalTheme);
                setTheme(finalTheme);
                
                // Listen for system theme changes if using system theme
                if (finalTheme === 'system' && window.matchMedia) {
                  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                  mediaQuery.addEventListener('change', function(e) {
                    console.log('[Theme Init] System theme changed:', e.matches ? 'dark' : 'light');
                    setTheme('system');
                  });
                }
              })();
            `
          }}
        />
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
            <ErrorBoundary>
              {isDevelopment ? (
                // Development: No AutoAuth component
                children
              ) : (
                // Production: Full authentication with AutoAuth
                <AutoAuth>
                  {children}
                </AutoAuth>
              )}
            </ErrorBoundary>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
