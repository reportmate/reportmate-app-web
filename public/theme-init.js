// Theme initialization script to prevent flash of wrong theme
// This should run before React hydration to set the correct theme class
(function() {
  // Check if we're running in a browser
  if (typeof window === 'undefined') return;
  
  function getStoredTheme() {
    try {
      return localStorage.getItem('reportmate-theme') || localStorage.getItem('theme');
    } catch (_error) {
      return null;
    }
  }
  
  function getSystemTheme() {
    if (window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        return mediaQuery.matches ? 'dark' : 'light';
      } catch (error) {
        return 'light';
      }
    }
    return 'light';
  }
  
  function setTheme(theme) {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply the correct theme
    if (theme === 'system') {
      const systemTheme = getSystemTheme();
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }
  
  // Initialize theme immediately
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
      // Silently fail - theme changes just won't be tracked
    }
  }
})();
