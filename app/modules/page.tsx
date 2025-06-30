"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useModules } from "../../src/lib/modules/ModuleRegistry"
import { initializeModules, installModule, uninstallModule, toggleModule, getModuleMarketplace } from "../../src/lib/modules/ModuleInit"

export default function ModulesManagementPage() {
  const { registry, modules, enabledModules } = useModules()
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [marketplace, setMarketplace] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed')

  useEffect(() => {
    const init = async () => {
      try {
        await initializeModules()
        const marketplaceData = await getModuleMarketplace()
        setMarketplace(marketplaceData)
        setInitialized(true)
      } catch (error) {
        console.error('Failed to initialize modules:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleToggleModule = async (moduleId: string) => {
    try {
      await toggleModule(moduleId)
      // Re-render by forcing a state update
      setInitialized(prev => !prev && true)
    } catch (error) {
      console.error('Failed to toggle module:', error)
    }
  }

  const handleInstallModule = async (moduleUrl: string) => {
    try {
      await installModule(moduleUrl)
      // Refresh marketplace and modules
      const marketplaceData = await getModuleMarketplace()
      setMarketplace(marketplaceData)
    } catch (error) {
      console.error('Failed to install module:', error)
    }
  }

  const handleUninstallModule = async (moduleId: string) => {
    try {
      await uninstallModule(moduleId)
      // Re-render by forcing a state update
      setInitialized(prev => !prev && true)
    } catch (error) {
      console.error('Failed to uninstall module:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading modules...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand and Back Navigation */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Module Management
              </h1>
            </div>
            
            {/* Quick Navigation */}
            <nav className="flex items-center gap-4">
              <Link
                href="/devices"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Devices
              </Link>
              <Link
                href="/events"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Events
              </Link>
              <Link
                href="/settings"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('installed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'installed'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Installed Modules ({modules.length})
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'marketplace'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Marketplace ({marketplace.length})
            </button>
          </nav>
        </div>

        {/* Installed Modules Tab */}
        {activeTab === 'installed' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Installed Modules
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your installed modules. Enable or disable modules to customize your dashboard and device views.
              </p>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <div key={module.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {module.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        v{module.version} {module.author && `by ${module.author}`}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      registry.isEnabled(module.id)
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {registry.isEnabled(module.id) ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  {module.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      {module.description}
                    </p>
                  )}

                  {/* Module Features */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Provides:</div>
                    <div className="flex flex-wrap gap-1">
                      {module.dashboardWidgets && module.dashboardWidgets.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {module.dashboardWidgets.length} widget{module.dashboardWidgets.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {module.deviceTabs && module.deviceTabs.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {module.deviceTabs.length} tab{module.deviceTabs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {module.dataProviders && module.dataProviders.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {module.dataProviders.length} provider{module.dataProviders.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {module.eventProcessors && module.eventProcessors.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {module.eventProcessors.length} processor{module.eventProcessors.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleModule(module.id)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        registry.isEnabled(module.id)
                          ? 'bg-gray-400 hover:bg-gray-500 text-white dark:bg-gray-600 dark:hover:bg-gray-700'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {registry.isEnabled(module.id) ? 'Disable' : 'Enable'}
                    </button>
                    {/* Core modules can't be uninstalled */}
                    {!module.id.startsWith('core.') && (
                      <button
                        onClick={() => handleUninstallModule(module.id)}
                        className="px-3 py-2 rounded-md text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Uninstall
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {modules.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  No modules installed
                </div>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Browse Marketplace
                </button>
              </div>
            )}
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Module Marketplace
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Discover and install new modules to extend ReportMate's functionality.
              </p>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {marketplace.map((module) => (
                <div key={module.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {module.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        v{module.version} by {module.author}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      module.installed
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {module.installed ? 'Installed' : 'Available'}
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {module.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {module.rating}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      {module.downloads.toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {module.installed ? (
                      <button
                        disabled
                        className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      >
                        Already Installed
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstallModule(module.downloadUrl)}
                        className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Install
                      </button>
                    )}
                    <button className="px-3 py-2 rounded-md text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white">
                      Info
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {marketplace.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  No modules available in marketplace
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check back later for new modules or contribute your own!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
