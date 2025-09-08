import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import { EdgeThemeFix } from "../src/components/edge-theme-fix";
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
                console.log('[Theme Init] User agent:', navigator.userAgent);
                
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
                  if (window.matchMedia) {
                    try {
                      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                      const matches = mediaQuery.matches;
                      console.log('[Theme Init] Media query:', mediaQuery);
                      console.log('[Theme Init] System prefers dark mode:', matches);
                      return matches ? 'dark' : 'light';
                    } catch (error) {
                      console.log('[Theme Init] matchMedia error:', error);
                      return 'light';
                    }
                  }
                  console.log('[Theme Init] matchMedia not available');
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
                  try {
                    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    
                    const handleChange = function(e) {
                      console.log('[Theme Init] System theme changed:', e.matches ? 'dark' : 'light');
                      setTheme('system');
                    };
                    
                    // Edge compatibility - use both methods
                    if (mediaQuery.addEventListener) {
                      mediaQuery.addEventListener('change', handleChange);
                    } else if (mediaQuery.addListener) {
                      mediaQuery.addListener(handleChange);
                    }
                  } catch (error) {
                    console.log('[Theme Init] Failed to set up media query listener:', error);
                  }
                }
              })();
            `
          }}
        />
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
            <EdgeThemeFix />
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
