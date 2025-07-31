'use client'

import React, { useState } from 'react'
import ScalableTabNavigation from '../../src/components/ui/ScalableTabNavigation'

const demoTabs = [
  { id: 'info', label: 'Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Device information, management status, and system details', category: 'Overview' },
  { id: 'installs', label: 'Installs', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10', description: 'Managed software installations and updates', category: 'Software' },
  { id: 'profiles', label: 'Profiles', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', description: 'MDM configuration profiles and settings', category: 'Management' },
  { id: 'applications', label: 'Applications', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', description: 'Installed applications and packages', category: 'Software' },
  { id: 'management', label: 'Management', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', description: 'Device management and enrollment status', category: 'Management' },
  { id: 'system', label: 'System', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', description: 'Operating system and system information', category: 'System' },
  { id: 'hardware', label: 'Hardware', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z', description: 'Hardware specifications and performance', category: 'System' },
  { id: 'network', label: 'Network', icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0', description: 'Network connectivity and settings', category: 'System' },
  { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', description: 'Security status and compliance', category: 'Security' },
  { id: 'events', label: 'Events', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Event history and activity log', category: 'Overview' },
  // Add more tabs to demonstrate scalability
  { id: 'backups', label: 'Backups', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4', description: 'Backup status and restoration', category: 'Management' },
  { id: 'certificates', label: 'Certificates', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', description: 'Digital certificates and encryption', category: 'Security' },
  { id: 'compliance', label: 'Compliance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', description: 'Compliance status and policies', category: 'Security' },
  { id: 'updates', label: 'Updates', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', description: 'System and software updates', category: 'Management' }
]

export default function TabLayoutDemo() {
  const [activeTab, setActiveTab] = useState('info')
  const [layout, setLayout] = useState<'icon-hover' | 'compact-multi-row' | 'grouped' | 'overflow-menu'>('overflow-menu')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Scalable Tab Navigation Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This demo showcases different approaches for handling large numbers of tabs in desktop layouts.
          </p>

          {/* Layout selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Layout:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'icon-hover', label: 'Icon + Hover Labels' },
                { value: 'compact-multi-row', label: 'Compact Multi-Row' },
                { value: 'grouped', label: 'Grouped by Category' },
                { value: 'overflow-menu', label: 'Overflow Menu' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLayout(option.value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    layout === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <ScalableTabNavigation
              tabs={demoTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              layout={layout}
              maxVisibleTabs={6}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={demoTabs.find(tab => tab.id === activeTab)?.icon || ''} />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {demoTabs.find(tab => tab.id === activeTab)?.label} Tab
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {demoTabs.find(tab => tab.id === activeTab)?.description}
              </p>
              <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                Current layout: <strong>{layout.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Layout explanations */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Icon + Hover Labels</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Shows only icons by default, with labels appearing on hover and for the active tab. Most space-efficient while maintaining usability.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ✓ Minimal space usage<br />
              ✓ Scales to many tabs<br />
              ✓ Clean, modern look
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Compact Multi-Row</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Uses multiple rows with compact buttons. Good for when you want all tabs visible at once.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ✓ All tabs visible<br />
              ✓ Wraps naturally<br />
              ✓ Mobile friendly
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Grouped by Category</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Organizes tabs into logical groups. Perfect when tabs have natural categories.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ✓ Logical organization<br />
              ✓ Reduces cognitive load<br />
              ✓ Scalable structure
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Overflow Menu</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Shows most important tabs, with less common ones in a dropdown menu.
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ✓ Prioritizes common tabs<br />
              ✓ Familiar pattern<br />
              ✓ Good for mixed usage
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
