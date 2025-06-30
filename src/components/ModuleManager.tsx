"use client"

import React, { useState, useEffect } from 'react'
import { moduleLoader, ModuleManifest, ModuleRepository, ModuleRuntime } from '../lib/modules/DynamicModuleLoader'

interface ModuleManagerProps {
  onClose?: () => void
}

export const ModuleManager: React.FC<ModuleManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'available' | 'repositories'>('installed')
  const [installedModules, setInstalledModules] = useState<Map<string, ModuleRuntime>>(new Map())
  const [availableModules, setAvailableModules] = useState<ModuleManifest[]>([])
  const [repositories, setRepositories] = useState<ModuleRepository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load installed modules
      setInstalledModules(moduleLoader.getLoadedModules())
      
      // Load available modules if on available tab
      if (activeTab === 'available') {
        const available = await moduleLoader.discoverModules()
        setAvailableModules(available)
      }
      
      // Load repositories if needed
      if (activeTab === 'repositories') {
        const response = await fetch('/api/modules/repositories')
        if (response.ok) {
          setRepositories(await response.json())
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load module data')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data when tab changes
  useEffect(() => {
    loadData()
  }, [activeTab])

  const handleInstallModule = async (moduleId: string, repositoryUrl?: string) => {
    setLoading(true)
    try {
      const success = await moduleLoader.installModule(moduleId, repositoryUrl || '')
      if (success) {
        await loadData()
      } else {
        setError(`Failed to install module: ${moduleId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleInstallFromRepository = async (repoUrl: string) => {
    setLoading(true)
    try {
      const success = await moduleLoader.installModuleFromRepository(repoUrl)
      if (success) {
        await loadData()
      } else {
        setError(`Failed to install module from repository: ${repoUrl}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleUninstallModule = async (moduleId: string) => {
    if (!confirm(`Are you sure you want to uninstall ${moduleId}?`)) return
    
    setLoading(true)
    try {
      const success = await moduleLoader.uninstallModule(moduleId)
      if (success) {
        await loadData()
      } else {
        setError(`Failed to uninstall module: ${moduleId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstallation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleModule = async (moduleId: string, enabled: boolean) => {
    setLoading(true)
    try {
      const success = await moduleLoader.toggleModule(moduleId, enabled)
      if (success) {
        await loadData()
      } else {
        setError(`Failed to ${enabled ? 'enable' : 'disable'} module: ${moduleId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRepository = async (repo: Omit<ModuleRepository, 'id'>) => {
    setLoading(true)
    try {
      const success = await moduleLoader.addRepository(repo)
      if (success) {
        await loadData()
      } else {
        setError('Failed to add repository')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Module Manager</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'installed'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Installed Modules
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Available Modules
          </button>
          <button
            onClick={() => setActiveTab('repositories')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'repositories'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Repositories
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 rounded">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!loading && activeTab === 'installed' && (
            <InstalledModulesTab
              modules={installedModules}
              onToggle={handleToggleModule}
              onUninstall={handleUninstallModule}
            />
          )}

          {!loading && activeTab === 'available' && (
            <AvailableModulesTab
              modules={availableModules}
              installedModules={installedModules}
              onInstall={handleInstallModule}
            />
          )}

          {!loading && activeTab === 'repositories' && (
            <RepositoriesTab
              repositories={repositories}
              onAdd={handleAddRepository}
              onRefresh={loadData}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Installed Modules Tab
const InstalledModulesTab: React.FC<{
  modules: Map<string, ModuleRuntime>
  onToggle: (moduleId: string, enabled: boolean) => void
  onUninstall: (moduleId: string) => void
}> = ({ modules, onToggle, onUninstall }) => {
  const moduleArray = Array.from(modules.entries())

  return (
    <div className="space-y-4">
      {moduleArray.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No modules installed
        </div>
      ) : (
        moduleArray.map(([moduleId, runtime]) => (
          <div
            key={moduleId}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {runtime.manifest.name || moduleId}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    v{runtime.manifest.version}
                  </span>
                  {runtime.manifest.official && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      Official
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {runtime.manifest.description}
                </p>
                {runtime.error && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    Error: {runtime.error}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={runtime.enabled}
                    onChange={(e) => onToggle(moduleId, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {runtime.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <button
                  onClick={() => onUninstall(moduleId)}
                  className="px-3 py-1 text-sm bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  Uninstall
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Available Modules Tab
const AvailableModulesTab: React.FC<{
  modules: ModuleManifest[]
  installedModules: Map<string, ModuleRuntime>
  onInstall: (moduleId: string, repositoryId: string) => void
}> = ({ modules, installedModules, onInstall }) => {
  return (
    <div className="space-y-4">
      {modules.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No modules available. Add repositories to discover modules.
        </div>
      ) : (
        modules.map((module) => {
          const isInstalled = installedModules.has(module.id)
          
          return (
            <div
              key={module.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {module.name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      v{module.version}
                    </span>
                    {module.official && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        Official
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded">
                      {module.category}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {module.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    by {module.author}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {isInstalled ? (
                    <span className="px-3 py-1 text-sm bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded">
                      Installed
                    </span>
                  ) : (
                    <button
                      onClick={() => onInstall(module.id, module.repository)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 rounded"
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// Repositories Tab
const RepositoriesTab: React.FC<{
  repositories: ModuleRepository[]
  onAdd: (repo: Omit<ModuleRepository, 'id'>) => void
  onRefresh: () => void
}> = ({ repositories, onAdd, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRepo, setNewRepo] = useState({
    name: '',
    url: '',
    branch: 'main',
    official: false,
    verified: false,
    enabled: true
  })

  const handleAddRepository = () => {
    if (newRepo.name && newRepo.url) {
      onAdd({
        ...newRepo,
        type: 'single'
      })
      setNewRepo({ name: '', url: '', branch: 'main', official: false, verified: false, enabled: true })
      setShowAddForm(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Module Repositories
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Repository
        </button>
      </div>

      {showAddForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add New Repository</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Repository Name"
              value={newRepo.name}
              onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              type="url"
              placeholder="Repository URL (GitHub)"
              value={newRepo.url}
              onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRepository}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Repository
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">{repo.name}</h4>
                  {repo.official && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      Official
                    </span>
                  )}
                  {repo.verified && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{repo.url}</p>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={repo.enabled}
                    onChange={(e) => {
                      // Handle repository toggle
                      console.log('Toggle repository:', repo.id, e.target.checked)
                    }}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enabled
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
