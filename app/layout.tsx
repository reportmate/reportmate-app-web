import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "../src/components/ErrorBoundary";
import { ThemeProvider } from "../src/components/theme-provider";
import { EdgeThemeFix } from "../src/components/edge-theme-fix";
import AuthProvider from "../components/auth/AuthProvider";
import AutoAuth from "../components/auth/AutoAuth";
import { SWRProvider } from "../src/providers/SWRProvider";
import { ToolbarWrapper } from "../src/components/navigation/ToolbarWrapper";

// Force dynamic rendering to ensure middleware runs
export const dynamic = 'force-dynamic'
export const revalidate = 0

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | ReportMate",
    default: "ReportMate Endpoint Monitoring",
  },
  description: "Real-time fleet monitoring and event tracking",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/apple-touch-icon-dark.png", sizes: "180x180", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ReportMate",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c4a6e" },
  ],
};

async function getDevices() {
  try {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    
    // Add timeout to prevent blocking the entire layout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`${apiUrl}/api/devices`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data) ? data : (data.devices || [])
    }
  } catch (error) {
    // Don't log abort errors - they're expected on timeout
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('[Layout] Failed to fetch devices:', error)
    }
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
      <head>
        {/* Enhanced Safari Web App support with dark mode icons (macOS Sequoia) */}
        <link rel="mask-icon" href="/mask-icon.svg" color="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.className} h-full antialiased bg-white dark:bg-black transition-colors duration-200`} suppressHydrationWarning>
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getStoredTheme() {
                  try {
                    const stored = localStorage.getItem('reportmate-theme') || localStorage.getItem('theme');
                    return stored;
                  } catch (e) {
                    return null;
                  }
                }
                
                function getSystemTheme() {
                  if (window.matchMedia) {
                    try {
                      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                      const matches = mediaQuery.matches;
                      return matches ? 'dark' : 'light';
                    } catch (error) {
                      return 'light';
                    }
                  }
                  return 'light';
                }
                
                function setTheme(theme) {
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  
                  if (theme === 'system') {
                    const systemTheme = getSystemTheme();
                    root.classList.add(systemTheme);
                    } else {
                    root.classList.add(theme);
                    }
                }
                
                const storedTheme = getStoredTheme();
                const finalTheme = storedTheme || 'system';
                setTheme(finalTheme);
                
                // Listen for system theme changes if using system theme
                if (finalTheme === 'system' && window.matchMedia) {
                  try {
                    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                    
                    const handleChange = function(e) {
                      setTheme('system');
                    };
                    
                    // Edge compatibility - use both methods
                    if (mediaQuery.addEventListener) {
                      mediaQuery.addEventListener('change', handleChange);
                    } else if (mediaQuery.addListener) {
                      mediaQuery.addListener(handleChange);
                    }
                  } catch (error) {
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
                  <ToolbarWrapper preloadedDevices={devices}>
                    {children}
                  </ToolbarWrapper>
                ) : (
                  // Production: Full authentication with AutoAuth
                  <AutoAuth>
                    <ToolbarWrapper preloadedDevices={devices}>
                      {children}
                    </ToolbarWrapper>
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
