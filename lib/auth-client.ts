// Client-safe auth utilities that don't depend on server environment variables
export const AUTH_PROVIDERS = {
  AZURE_AD: 'azure-ad',
  GOOGLE: 'google', 
  CREDENTIALS: 'credentials'
} as const

// Helper function to get provider display names (client-safe)
export const getProviderDisplayName = (provider: string): string => {
  switch (provider) {
    case AUTH_PROVIDERS.AZURE_AD:
      return 'Microsoft Entra ID'
    case AUTH_PROVIDERS.GOOGLE:
      return 'Google'
    case AUTH_PROVIDERS.CREDENTIALS:
      return 'Email & Password'
    default:
      return provider
  }
}

// Provider icon configurations (client-safe)
export const getProviderIconConfig = (providerId: string) => {
  switch (providerId) {
    case 'azure-ad':
      return {
        type: 'svg',
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        paths: ['M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z']
      }
    case 'google':
      return {
        type: 'svg',
        viewBox: '0 0 24 24',
        paths: [
          { fill: '#4285F4', d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' },
          { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' },
          { fill: '#FBBC05', d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' },
          { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' }
        ]
      }
    case 'credentials':
      return {
        type: 'outline',
        viewBox: '0 0 24 24',
        strokeWidth: 2,
        paths: ['M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207']
      }
    default:
      return {
        type: 'outline',
        viewBox: '0 0 24 24',
        strokeWidth: 2,
        paths: ['M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z']
      }
  }
}

// Helper to get error messages (client-safe)
export const getErrorMessage = (error: string) => {
  switch (error) {
    case 'Configuration':
      return 'Authentication service configuration error. Please contact support.'
    case 'AccessDenied':
      return 'Access denied. You may not have permission to access this application.'
    case 'Verification':
      return 'Email verification required. Please verify your email address.'
    case 'Default':
      return 'An error occurred during authentication. Please try again.'
    default:
      return 'Authentication failed. Please try again.'
  }
}