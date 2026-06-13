"use client"

import React, { useState } from 'react'
import { ModuleManager } from '../../src/components/ModuleManager'
import { ThemeToggle } from '../../src/components/theme-toggle'
import { useDemoMode } from '../../src/providers/DemoModeProvider'
import { useHasRole } from '../../hooks/useAuth'
import { ADMIN_ROLE } from '../../lib/auth-roles'
import Link from 'next/link'
import { InventoryMappingEditor } from '../../src/components/settings/InventoryMappingEditor'
import { SecurityRulesEditor } from '../../src/components/settings/SecurityRulesEditor'
import { useSettings } from '../../src/providers/SettingsProvider'

type MaintStatus = { type: 'idle' | 'loading' | 'success' | 'error'; message?: string }

export default function ClientSettingsPage() {
  const { isFirstTime } = useSettings()
  const [activeSection, setActiveSection] = useState<'general' | 'inventory' | 'rules' | 'modules' | 'security' | 'integrations' | 'maintenance'>('general')
  const [clearDays, setClearDays] = useState(10)
  const [clearStatus, setClearStatus] = useState<MaintStatus>({ type: 'idle' })
  const [deleteSerial, setDeleteSerial] = useState('')
  const [deleteStatus, setDeleteStatus] = useState<MaintStatus>({ type: 'idle' })
  const [bulkSerials, setBulkSerials] = useState('')
  const [bulkStatus, setBulkStatus] = useState<MaintStatus & { results?: Array<{ serialNumber: string; ok: boolean; detail?: string }> }>({ type: 'idle' })
  const { isDemoMode } = useDemoMode()
  const isAdmin = useHasRole(ADMIN_ROLE)
  // Only admins on a real instance may change anything; demo is read-only.
  const canEdit = isAdmin && !isDemoMode

  // In demo, expose only the read-only-safe sections so the configurable
  // settings are visible to an audience without surfacing destructive
  // maintenance actions.
  const allMenuItems = [
    { id: 'general', name: 'General', icon: '' },
    { id: 'inventory', name: 'Inventory Mapping', icon: '' },
    { id: 'rules', name: 'Security Rules', icon: '' },
    { id: 'modules', name: 'Modules', icon: '' },
    { id: 'security', name: 'Security', icon: '' },
    { id: 'integrations', name: 'Integrations', icon: '' },
    { id: 'maintenance', name: 'Maintenance', icon: '' },
  ]
  const menuItems = isDemoMode
    ? allMenuItems.filter((i) => ['general', 'inventory', 'rules'].includes(i.id))
    : allMenuItems

  async function handleClearInstallsErrors() {
    if (clearStatus.type === 'loading') return

    const confirmed = window.confirm(
      `This will clear all installs errors and warnings from devices that haven't reported in ${clearDays} or more days. Continue?`
    )
    if (!confirmed) return

    setClearStatus({ type: 'loading' })

    try {
      const response = await fetch(`/api/admin/installs/clear-errors?days=${clearDays}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        setClearStatus({ type: 'error', message: data.detail || data.error || 'Request failed' })
        return
      }

      setClearStatus({
        type: 'success',
        message: `Cleared errors and warnings from ${data.cleared} device${data.cleared === 1 ? '' : 's'} (${data.totalStale} stale device${data.totalStale === 1 ? '' : 's'} checked)`
      })
    } catch (err) {
      setClearStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }

  async function handleDeleteSingleDevice() {
    const serial = deleteSerial.trim()
    if (!serial) return
    if (deleteStatus.type === 'loading') return
    const confirmed = window.confirm(
      `Permanently delete device "${serial}"? This removes all module data, events, and usage history. This cannot be undone.`
    )
    if (!confirmed) return

    setDeleteStatus({ type: 'loading' })
    try {
      const response = await fetch(`/api/admin/device/${encodeURIComponent(serial)}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setDeleteStatus({ type: 'error', message: data.detail || data.error || 'Delete failed' })
        return
      }
      const moduleRecords = data?.deletedData?.totalModuleRecords ?? 0
      const events = data?.deletedData?.events ?? 0
      setDeleteStatus({
        type: 'success',
        message: `Deleted ${serial} (${events} events, ${moduleRecords} module records).`,
      })
      setDeleteSerial('')
    } catch (err) {
      setDeleteStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }

  async function handleBulkDelete() {
    if (bulkStatus.type === 'loading') return
    const serials = bulkSerials
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (serials.length === 0) return
    const confirmed = window.confirm(
      `Permanently delete ${serials.length} device${serials.length === 1 ? '' : 's'}? This cannot be undone.`
    )
    if (!confirmed) return

    setBulkStatus({ type: 'loading' })
    try {
      const response = await fetch('/api/admin/devices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumbers: serials }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setBulkStatus({ type: 'error', message: data.detail || data.error || 'Bulk delete failed' })
        return
      }
      setBulkStatus({
        type: 'success',
        message: `Deleted ${data.succeeded} of ${data.requested} devices (${data.failed} failed).`,
        results: data.results,
      })
      if (data.failed === 0) setBulkSerials('')
    } catch (err) {
      setBulkStatus({ type: 'error', message: err instanceof Error ? err.message : 'Network error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {isFirstTime && canEdit && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Finish setting up ReportMate</h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Run the one-time setup to auto-discover your inventory fields and seed security rules.
              </p>
            </div>
            <Link href="/settings/onboarding"
              className="ml-4 flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              Run setup
            </Link>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your ReportMate instance and manage modules
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <nav className="space-y-1 p-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as any)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeSection === item.id
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {activeSection === 'general' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    General Settings
                  </h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your Organization"
                          defaultValue="ReportMate Organization"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Time Zone
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date Format
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme Preference
                        </label>
                        <div className="flex items-center gap-4">
                          <ThemeToggle />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Current theme setting
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Container Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Image Tag
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value="reportmateacr.azurecr.io/reportmate:20250902152337-e8e4c2d"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-mono text-sm"
                            />
                            <button
                              className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                              onClick={() => {
                                navigator.clipboard.writeText("reportmateacr.azurecr.io/reportmate:20250902152337-e8e4c2d")
                              }}
                            >
                              Copy
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Current running container version
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'inventory' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Inventory Mapping
                  </h2>
                  <InventoryMappingEditor readOnly={!canEdit} />
                </div>
              )}

              {activeSection === 'rules' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Security Rules
                  </h2>
                  <SecurityRulesEditor readOnly={!canEdit} />
                </div>
              )}

              {activeSection === 'modules' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Module Management
                  </h2>
                  <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                      Enable or disable collection modules for your fleet.
                    </p>
                    <ModuleManager />
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Security Settings
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Authentication Configuration
                      </h3>
                      
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Azure AD Integration</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Use Microsoft Entra ID for authentication</p>
                          </div>
                          <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600">
                            <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                              Tenant ID
                            </label>
                            <input
                              type="text"
                              readOnly
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              value="79349310-287D-8166-52FC-0644E27378F7"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                              Client ID
                            </label>
                            <input
                              type="text"
                              readOnly
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              value="273c3325-1335-4200-8451-b0e513837941"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        API Access Tokens
                      </h3>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                              <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">CI/CD Pipeline</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Mar 10, 2025</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Never</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Revoke</button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4">
                        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          Create New Token
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'integrations' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Integrations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                            J
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">JIRA</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Connect to JIRA Cloud</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                          Configure
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Automatically create tickets from critical alerts and sync status back to ReportMate.
                      </p>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xl">
                            S
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Slack</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Slack Notifications</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                          Configure
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Send alerts and daily summaries to Slack channels for immediate visibility.
                      </p>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xl">
                            S
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">ServiceNow</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ITSM Integration</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
                          Configure
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create incidents and sync CMDB data with ServiceNow instance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'maintenance' && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Maintenance
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Manual cleanup operations for stale data. These actions are not automated and must be triggered by an administrator.
                    </p>
                  </div>

                  {!isAdmin && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Maintenance actions require the <span className="font-mono">{ADMIN_ROLE}</span> role. Contact a ReportMate administrator if you need access.
                      </p>
                    </div>
                  )}

                  {isAdmin && (<>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Clear Stale Installs Errors and Warnings
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Clears error and warning fields from installs data for devices that have not reported
                      within the specified number of days. This removes outdated error messages from
                      decommissioned or offline devices that are no longer relevant.
                    </p>

                    <div className="flex items-end gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Older than (days)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={clearDays}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10)
                            if (!isNaN(v) && v >= 1 && v <= 365) setClearDays(v)
                          }}
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={handleClearInstallsErrors}
                        disabled={clearStatus.type === 'loading'}
                        className={`px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                          clearStatus.type === 'loading'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {clearStatus.type === 'loading' ? 'Clearing...' : 'Clear Errors and Warnings'}
                      </button>
                    </div>

                    {clearStatus.type === 'success' && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">{clearStatus.message}</p>
                      </div>
                    )}

                    {clearStatus.type === 'error' && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">{clearStatus.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50/30 dark:bg-red-900/10">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Delete Device by Serial Number
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Permanently removes a single device along with all module data, events, and usage history. Prefer archiving for normal decommissioning. This action cannot be undone.
                    </p>

                    <div className="flex items-end gap-4 mb-4">
                      <div className="flex-1 max-w-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Serial number
                        </label>
                        <input
                          type="text"
                          value={deleteSerial}
                          onChange={(e) => setDeleteSerial(e.target.value)}
                          placeholder="e.g. 0F33V9G25083HJ"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <button
                        onClick={handleDeleteSingleDevice}
                        disabled={deleteStatus.type === 'loading' || !deleteSerial.trim()}
                        className="px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
                      >
                        {deleteStatus.type === 'loading' ? 'Deleting...' : 'Delete Device'}
                      </button>
                    </div>

                    {deleteStatus.type === 'success' && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200">{deleteStatus.message}</p>
                      </div>
                    )}
                    {deleteStatus.type === 'error' && (
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">{deleteStatus.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50/30 dark:bg-red-900/10">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Bulk Delete Devices
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Paste one serial number per line (or comma-separated). Each device is deleted independently; per-device results are reported below. Capped at 100 devices per request.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serial numbers
                      </label>
                      <textarea
                        value={bulkSerials}
                        onChange={(e) => setBulkSerials(e.target.value)}
                        rows={6}
                        placeholder="0F33V9G25083HJ&#10;ABCD1234&#10;..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>

                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkStatus.type === 'loading' || !bulkSerials.trim()}
                      className="px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
                    >
                      {bulkStatus.type === 'loading' ? 'Deleting...' : 'Delete All Listed Devices'}
                    </button>

                    {bulkStatus.type === 'success' && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-200 mb-2">{bulkStatus.message}</p>
                        {bulkStatus.results && bulkStatus.results.some((r) => !r.ok) && (
                          <ul className="text-xs text-gray-700 dark:text-gray-300 font-mono space-y-1 mt-2">
                            {bulkStatus.results
                              .filter((r) => !r.ok)
                              .map((r) => (
                                <li key={r.serialNumber}>
                                  <span className="text-red-700 dark:text-red-300">FAIL</span> {r.serialNumber}: {r.detail || 'unknown error'}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {bulkStatus.type === 'error' && (
                      <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200">{bulkStatus.message}</p>
                      </div>
                    )}
                  </div>
                  </>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
