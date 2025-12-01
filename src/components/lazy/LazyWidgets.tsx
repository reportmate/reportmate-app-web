"use client"

import dynamic from 'next/dynamic'
import React from 'react'

// Loading skeleton for widgets
const WidgetSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
)

// Loading skeleton for charts
const ChartSkeleton = () => (
  <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
    <div className="text-gray-400 dark:text-gray-500">Loading chart...</div>
  </div>
)

// Loading skeleton for tables
const TableSkeleton = () => (
  <div className="space-y-2 animate-pulse">
    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
    ))}
  </div>
)

/**
 * Lazy-loaded OS Version Widget
 * Reduces initial bundle size by loading chart code only when needed
 */
export const LazyOSVersionWidget = dynamic(
  () => import('../../lib/modules/widgets/OSVersionWidget').then(mod => mod.OSVersionWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false, // Charts don't need SSR
  }
)

/**
 * Lazy-loaded Platform Distribution Widget
 */
export const LazyPlatformDistributionWidget = dynamic(
  () => import('../../lib/modules/widgets/PlatformDistributionWidget').then(mod => mod.PlatformDistributionWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false,
  }
)

/**
 * Lazy-loaded New Clients Widget
 */
export const LazyNewClientsWidget = dynamic(
  () => import('../../lib/modules/widgets/NewClientsWidget').then(mod => mod.NewClientsWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Status Widget
 */
export const LazyStatusWidget = dynamic(
  () => import('../../lib/modules/widgets/StatusWidget').then(mod => mod.StatusWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false,
  }
)

/**
 * Lazy-loaded Dashboard Stats Widgets
 */
export const LazyWarningStatsWidget = dynamic(
  () => import('../../lib/modules/widgets/DashboardStats').then(mod => mod.WarningStatsWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false,
  }
)

export const LazyErrorStatsWidget = dynamic(
  () => import('../../lib/modules/widgets/DashboardStats').then(mod => mod.ErrorStatsWidget),
  {
    loading: () => <WidgetSkeleton />,
    ssr: false,
  }
)

// Re-export skeletons for use elsewhere
export { WidgetSkeleton, ChartSkeleton, TableSkeleton }
