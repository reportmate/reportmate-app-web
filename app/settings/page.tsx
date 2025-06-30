"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { ModuleManager } from '../../src/components/ModuleManager'

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'general' | 'modules' | 'security' | 'integrations'>('general')
  const [showModuleManager, setShowModuleManager] = useState(false)

  const menuItems = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'modules', name: 'Modules', icon: '🧩' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand and Back Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img 
                    src="/reportmate-logo.png" 
                    alt="ReportMate" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    ReportMate
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                    Settings & Configuration
                  </p>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
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
                href="/modules"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Modules
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Dashboard Refresh Interval
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="30">30 seconds</option>
                          <option value="60">1 minute</option>
                          <option value="300">5 minutes</option>
                          <option value="600">10 minutes</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Events Retention Period
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="7">7 days</option>
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="365">1 year</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Dashboard Preferences
                      </h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3" defaultChecked />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Enable dark mode by default
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3" defaultChecked />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Show connection status indicator
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3" defaultChecked />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Auto-refresh widget data
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'modules' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Module Management
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Install, configure, and manage ReportMate modules. 
                        <Link href="/modules" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-1">
                          Visit the full module manager →
                        </Link>
                      </p>
                    </div>
                    <button
                      onClick={() => setShowModuleManager(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open Module Manager
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Module Status Cards */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Hardware Monitoring</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Monitor CPU, memory, and disk usage
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400">v1.2.0</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Security Overview</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Security status and compliance checks
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400">v1.1.0</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Network Diagnostics</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Network connectivity and performance
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400">v1.0.0</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                          Disabled
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Module Repositories
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            <span className="font-medium text-gray-900 dark:text-white">Official ReportMate Modules</span>
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              Official
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            github.com/reportmate/reportmate-modules
                          </p>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400">Enabled</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div className="flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            <span className="font-medium text-gray-900 dark:text-white">Community Modules</span>
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                              Verified
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            github.com/reportmate/community-modules
                          </p>
                        </div>
                        <span className="text-sm text-green-600 dark:text-green-400">Enabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Security Settings
                  </h2>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                      <div className="flex">
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Module Security Settings
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                            <p>These settings control how modules are validated and loaded. Changes may affect system security.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-start">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3 mt-1" defaultChecked />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Require module signatures
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Only load modules that have been digitally signed by verified publishers
                            </p>
                          </div>
                        </label>
                      </div>
                      
                      <div>
                        <label className="flex items-start">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3 mt-1" />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Only allow official repositories
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Restrict module installation to official ReportMate repositories only
                            </p>
                          </div>
                        </label>
                      </div>
                      
                      <div>
                        <label className="flex items-start">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3 mt-1" defaultChecked />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Enable module sandboxing
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Run modules in isolated environments to prevent system access
                            </p>
                          </div>
                        </label>
                      </div>
                      
                      <div>
                        <label className="flex items-start">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600 mr-3 mt-1" defaultChecked />
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Audit module installations
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Log all module installations, updates, and removals
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Save Security Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'integrations' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Integrations
                  </h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">Azure Active Directory</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Integrate with Azure AD for authentication and user management
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                            Connected
                          </span>
                          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 rounded transition-colors">
                            Configure
                          </button>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">Slack Notifications</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Send alerts and notifications to Slack channels
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            Not Connected
                          </span>
                          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 rounded transition-colors">
                            Connect
                          </button>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">Microsoft Teams</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Send notifications and alerts to Microsoft Teams
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            Not Connected
                          </span>
                          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 rounded transition-colors">
                            Connect
                          </button>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="font-medium text-gray-900 dark:text-white">Webhook Integration</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Send events to custom webhook endpoints
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            2 Configured
                          </span>
                          <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 rounded transition-colors">
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Module Manager Modal */}
      {showModuleManager && (
        <ModuleManager onClose={() => setShowModuleManager(false)} />
      )}
    </div>
  )
}
