import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import { EdgeThemeFix } from "../src/components/edge-theme-fix";
import AuthProvider from "../components/auth/AuthProvider";
import AutoAuth from "../components/auth/AutoAuth";
import { SWRProvider } from "../src/providers/SWRProvider";
import { AppToolbar } from "../src/components/navigation/AppToolbar";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic'
export const revalidate = 0

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReportMate Fleet Dashboard",
  description: "Real-time fleet monitoring and event tracking",
};

async function getDevices() {
  try {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data) ? data : (data.devices || [])
    }
  } catch (error) {
    console.error('[Layout] Failed to fetch devices:', error)
  }
  return []
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // For development, completely bypass all authentication
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Fetch devices for search preloading
  const devices = await getDevices()
  
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
          <SWRProvider>
            <ThemeProvider defaultTheme="system" storageKey="reportmate-theme">
              <EdgeThemeFix />
              <ErrorBoundary>
                {isDevelopment ? (
                  // Development: No AutoAuth component
                  <>
                    <AppToolbar preloadedDevices={devices} />
                    {children}
                  </>
                ) : (
                  // Production: Full authentication with AutoAuth
                  <AutoAuth>
                    <AppToolbar preloadedDevices={devices} />
                    {children}
                  </AutoAuth>
                )}
              </ErrorBoundary>
            </ThemeProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
