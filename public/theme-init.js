// Theme initialization script to prevent flash of wrong theme
// This should run before React hydration to set the correct theme class
(function() {
  // Check if we're running in a browser
  if (typeof window === 'undefined') return;
  
  function getStoredTheme() {
    try {
      return localStorage.getItem('reportmate-theme') || localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  }
  
  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
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
      console.log('[Theme Debug] Applied system theme:', systemTheme);
    } else {
      root.classList.add(theme);
      console.log('[Theme Debug] Applied stored theme:', theme);
    }
  }
  
  // Initialize theme immediately
  const storedTheme = getStoredTheme();
  const finalTheme = storedTheme || 'system';
  
  console.log('[Theme Debug] Stored theme:', storedTheme);
  console.log('[Theme Debug] System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches);
  console.log('[Theme Debug] User agent:', navigator.userAgent);
  console.log('[Theme Debug] Final theme:', finalTheme);
  
  setTheme(finalTheme);
  
  // Listen for system theme changes if using system theme
  if (finalTheme === 'system' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', function(e) {
      const systemTheme = e.matches ? 'dark' : 'light';
      console.log('[Theme Debug] System theme changed to:', systemTheme);
      setTheme('system');
    });
  }
})();
