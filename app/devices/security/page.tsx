"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { calculateDeviceStatus } from "../../../src/lib/data-processing"
import DeviceFilters, { FilterOptions } from "../../../src/components/shared/DeviceFilters"
import { usePlatformFilterSafe, normalizePlatform } from "../../../src/providers/PlatformFilterProvider"
import { CollapsibleSection } from "../../../src/components/ui/CollapsibleSection"
import { useScrollCollapse } from "../../../src/hooks/useScrollCollapse"

// ============ TYPE DEFINITIONS ============

interface SecurityDevice {
  id: string
  deviceId: string
  deviceName: string
  serialNumber: string
  lastSeen: string
  collectedAt: string
  platform: string
  // Firewall
  firewallEnabled: boolean
  // Encryption
  encryptionEnabled: boolean
  // Antivirus / Protection
  antivirusName: string
  antivirusEnabled: boolean
  antivirusUpToDate: boolean
  antivirusVersion?: string
  antivirusLastScan?: string
  // Detection (threat alerts count - 0 = clean)
  detectionCount: number
  // Tampering
  tpmPresent: boolean
  tpmEnabled: boolean
  secureBootEnabled: boolean
  sipEnabled?: boolean
  gatekeeperEnabled: boolean
  // Protection (Windows)
  memoryIntegrityEnabled: boolean
  coreIsolationEnabled: boolean
  smartAppControlState?: string
  // Remote Access
  secureShell?: {
    statusDisplay: string
    isConfigured: boolean
    isServiceRunning: boolean
  }
  rdpEnabled: boolean
  // Certificates
  certificateCount: number
  expiredCertCount: number
  expiringSoonCertCount: number
  // Vulnerabilities
  cveCount: number
  criticalCveCount: number
  // Misc
  autoLoginUser?: string
  // Inventory (enriched)
  status?: string
  catalog?: string
  usage?: string
  location?: string
  assetTag?: string
}

interface CertificateResult {
  serialNumber: string
  platform: string
  deviceName: string
  commonName: string
  issuer: string
  subject: string
  status: string
  notAfter: string
  notBefore: string
  daysUntilExpiry: number
  isExpired: boolean
  isExpiringSoon: boolean
  storeName: string
  storeLocation: string
  keyAlgorithm: string
  certSerialNumber: string
  isSelfSigned: boolean
}

type SortColumn = 'device' | 'encryption' | 'protection' | 'detection' | 'firewall' | 'tampering' | 'remote' | 'certificates' | 'cve'

// ============ LOADING SKELETON ============

function LoadingSkeleton() {
  return (
    <div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-3 flex items-center justify-between bg-white dark:bg-gray-800 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-3"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-6"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
        <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="px-3 py-3 flex space-x-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ MINI DONUT WIDGET ============

function MiniDonut({ 
  data, 
  colors, 
  title, 
  onFilter, 
  activeFilter 
}: { 
  data: { label: string; value: number }[]
  colors: Record<string, string>
  title: string
  onFilter?: (label: string) => void
  activeFilter?: string
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercent = 0
  const radius = 35
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      {total === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No data</p>
      ) : (
        <div className="flex items-start gap-3">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              {data.map((item) => {
                const percent = item.value / total
                const strokeDasharray = `${percent * circumference} ${circumference}`
                const strokeDashoffset = -cumulativePercent * circumference
                cumulativePercent += percent
                return (
                  <circle
                    key={item.label}
                    cx="50" cy="50" r={radius}
                    fill="transparent"
                    stroke={colors[item.label] || '#cbd5e1'}
                    strokeWidth="16"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            {data.map(item => {
              const isActive = activeFilter === item.label
              return (
                <div 
                  key={item.label}
                  onClick={() => onFilter?.(isActive ? '' : item.label)}
                  className={`flex items-center justify-between text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 px-1 py-0.5 rounded transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-600 ring-1 ring-gray-300 dark:ring-gray-500' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[item.label] || '#cbd5e1' }} />
                    <span className="text-gray-600 dark:text-gray-400 truncate">{item.label}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white ml-1">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============ BADGE HELPERS ============

const greenBadge = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
const redBadge = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
const grayBadge = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
const amberBadge = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
}

// ============ SORTABLE HEADER ============

function SortHeader({ label, column, sortColumn, sortDirection, onSort }: {
  label: string; column: SortColumn; sortColumn: SortColumn; sortDirection: 'asc' | 'desc'; onSort: (c: SortColumn) => void
}) {
  return (
    <th
      onClick={() => onSort(column)}
      className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none whitespace-nowrap"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column && (
          <svg className={`w-3 h-3 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </th>
  )
}

// ============ MAIN CONTENT ============

function SecurityPageContent() {
  const searchParams = useSearchParams()
  const { platformFilter: globalPlatformFilter, isPlatformVisible } = usePlatformFilterSafe()

  // Data
  const [devices, setDevices] = useState<SecurityDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedUsages, setSelectedUsages] = useState<string[]>([])

  // Widget click-filters
  const [encryptionFilter, setEncryptionFilter] = useState('')
  const [protectionFilter, setProtectionFilter] = useState('')
  const [detectionFilter, setDetectionFilter] = useState('')
  const [firewallFilter, setFirewallFilter] = useState('')
  const [tamperingFilter, setTamperingFilter] = useState('')
  const [remoteFilter, setRemoteFilter] = useState('')
  const [certFilter, setCertFilter] = useState('')
  const [cveFilter, setCveFilter] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('device')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Accordion
  const [widgetsExpanded, setWidgetsExpanded] = useState(true)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [certSearchExpanded, setCertSearchExpanded] = useState(false)

  const { tableContainerRef, effectiveFiltersExpanded, effectiveWidgetsExpanded } = useScrollCollapse(
    { filters: filtersExpanded, widgets: widgetsExpanded },
    { enabled: !loading }
  )

  // Certificate search
  const [certSearchQuery, setCertSearchQuery] = useState('')
  const [certSearchStatus, setCertSearchStatus] = useState('all')
  const [certResults, setCertResults] = useState<CertificateResult[]>([])
  const [certSearchLoading, setCertSearchLoading] = useState(false)
  const [certSearchPerformed, setCertSearchPerformed] = useState(false)
  const [selectedCertName, setSelectedCertName] = useState<string | null>(null)

  const hasActiveWidgetFilter = !!(encryptionFilter || protectionFilter || detectionFilter || firewallFilter || tamperingFilter || remoteFilter || certFilter || cveFilter)

  const clearWidgetFilters = () => {
    setEncryptionFilter('')
    setProtectionFilter('')
    setDetectionFilter('')
    setFirewallFilter('')
    setTamperingFilter('')
    setRemoteFilter('')
    setCertFilter('')
    setCveFilter('')
  }

  // ============ DATA FETCHING ============

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const response = await fetch('/api/modules/security', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        const enriched = data.map((s: SecurityDevice) => ({
          ...s,
          status: calculateDeviceStatus(s.lastSeen)
        }))
        setDevices(enriched)
      } catch (err) {
        console.error('Error fetching security:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }
    fetchSecurity()
  }, [])

  // ============ CERTIFICATE SEARCH ============

  const searchCertificates = useCallback(async () => {
    if (!certSearchQuery.trim() && certSearchStatus === 'all') return
    setCertSearchLoading(true)
    setCertSearchPerformed(true)
    try {
      const params = new URLSearchParams()
      if (certSearchQuery.trim()) params.set('search', certSearchQuery.trim())
      if (certSearchStatus !== 'all') params.set('status', certSearchStatus)
      const response = await fetch(`/api/modules/security/certificates?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data = await response.json()
      setCertResults(Array.isArray(data) ? data : [])
      setSelectedCertName(null)
    } catch (err) {
      console.error('Certificate search error:', err)
      setCertResults([])
    } finally {
      setCertSearchLoading(false)
    }
  }, [certSearchQuery, certSearchStatus])

  // Auto-search when status filter changes (if there's already a search query)
  useEffect(() => {
    if (certSearchQuery.trim() && certSearchStatus !== 'all') {
      searchCertificates()
    }
  }, [certSearchStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Grouped certificate results: group by commonName, track device serials
  const groupedCertResults = useMemo(() => {
    if (certResults.length === 0) return []
    const groups: Record<string, { commonName: string; issuer: string; status: string; devices: { serialNumber: string; deviceName: string; notAfter: string; isExpired: boolean; isExpiringSoon: boolean }[]; expiredCount: number; expiringCount: number; validCount: number }> = {}
    for (const cert of certResults) {
      const key = cert.commonName || 'Unknown'
      if (!groups[key]) {
        groups[key] = { commonName: key, issuer: cert.issuer, status: cert.status, devices: [], expiredCount: 0, expiringCount: 0, validCount: 0 }
      }
      // Avoid duplicate devices within same cert group
      if (!groups[key].devices.some(d => d.serialNumber === cert.serialNumber)) {
        groups[key].devices.push({ serialNumber: cert.serialNumber, deviceName: cert.deviceName, notAfter: cert.notAfter, isExpired: cert.isExpired, isExpiringSoon: cert.isExpiringSoon })
      }
      if (cert.isExpired) groups[key].expiredCount++
      else if (cert.isExpiringSoon) groups[key].expiringCount++
      else groups[key].validCount++
    }
    return Object.values(groups).sort((a, b) => b.devices.length - a.devices.length)
  }, [certResults])

  // Serial numbers of devices matching the selected cert
  const certFilterSerials = useMemo(() => {
    if (!selectedCertName) return null
    const group = groupedCertResults.find(g => g.commonName === selectedCertName)
    if (!group) return null
    return new Set(group.devices.map(d => d.serialNumber))
  }, [selectedCertName, groupedCertResults])

  // ============ FILTER TOGGLES ============

  const toggleStatus = (s: string) => setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleCatalog = (c: string) => setSelectedCatalogs(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleArea = (a: string) => setSelectedAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  const toggleLocation = (l: string) => setSelectedLocations(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
  const toggleFleet = (f: string) => setSelectedFleets(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  const togglePlatform = (p: string) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  const toggleUsage = (u: string) => setSelectedUsages(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u])

  const clearAllFilters = () => {
    setSelectedStatuses([]); setSelectedCatalogs([]); setSelectedAreas([])
    setSelectedLocations([]); setSelectedFleets([]); setSelectedPlatforms([]); setSelectedUsages([])
    setEncryptionFilter(''); setProtectionFilter(''); setDetectionFilter('')
    setFirewallFilter(''); setTamperingFilter(''); setRemoteFilter('')
    setCertFilter(''); setCveFilter(''); setSearchQuery('')
    setSelectedCertName(null); setCertResults([]); setCertSearchQuery(''); setCertSearchPerformed(false)
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // ============ PLATFORM HELPERS ============

  const isWin = (d: SecurityDevice) => normalizePlatform(d.platform) === 'Windows'

  const getTamperSecured = (d: SecurityDevice) =>
    isWin(d) ? (d.tpmPresent && d.tpmEnabled) : (d.sipEnabled === true)

  const getTamperLabel = (d: SecurityDevice): string => {
    if (isWin(d)) return d.secureBootEnabled ? 'Secured' : 'Insecure'
    return (d.sipEnabled === true || d.secureBootEnabled) ? 'Secured' : 'Insecure'
  }

  const getProtectionLabel = (d: SecurityDevice): string => {
    if (d.antivirusEnabled && d.antivirusUpToDate) return 'Current'
    if (d.antivirusEnabled) return 'Out of Date'
    return 'Disabled'
  }

  const getRemoteLabel = (d: SecurityDevice): string => {
    const hasSsh = d.secureShell?.isServiceRunning
    if (isWin(d)) {
      if (hasSsh && d.rdpEnabled) return 'SSH + RDP'
      if (hasSsh) return 'SSH Only'
      if (d.rdpEnabled) return 'RDP Only'
      return 'Disabled'
    }
    return hasSsh ? 'SSH Enabled' : 'Disabled'
  }

  const getCertLabel = (d: SecurityDevice): string => {
    if (d.expiredCertCount > 0) return 'Has Expired'
    if (d.expiringSoonCertCount > 0) return 'Expiring Soon'
    return 'Valid'
  }

  const getCveLabel = (d: SecurityDevice): string => {
    if (d.criticalCveCount > 0) return 'Critical'
    if (d.cveCount > 0) return 'Has CVEs'
    return 'None'
  }

  // ============ WIDGET STATS (computed from platform-filtered base) ============

  const platformFiltered = devices.filter(d => {
    if (globalPlatformFilter !== 'all' && !isPlatformVisible(normalizePlatform(d.platform))) return false
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(normalizePlatform(d.platform))) return false
    return true
  })

  const countBy = (fn: (d: SecurityDevice) => string) => {
    const counts: Record<string, number> = {}
    for (const d of platformFiltered) {
      const label = fn(d)
      counts[label] = (counts[label] || 0) + 1
    }
    return counts
  }

  const encryptionCounts = countBy(d => d.encryptionEnabled ? 'Encrypted' : 'Not Encrypted')
  const protectionCounts = countBy(getProtectionLabel)
  const detectionCounts = countBy(d => (d.detectionCount ?? 0) > 0 ? 'Threats Detected' : 'Clean')
  const firewallCounts = countBy(d => d.firewallEnabled ? 'Enabled' : 'Disabled')
  const tamperingCounts = countBy(getTamperLabel)
  const remoteCounts = countBy(getRemoteLabel)
  const certCounts = countBy(getCertLabel)
  const cveCounts = countBy(getCveLabel)

  // ============ FILTER OPTIONS ============

  const filterOptions: FilterOptions = {
    statuses: [...new Set(devices.map(d => d.status).filter(Boolean))].sort() as string[],
    catalogs: [...new Set(devices.map(d => d.catalog).filter(Boolean))].sort() as string[],
    areas: [],
    locations: [...new Set(devices.map(d => d.location).filter(Boolean))].sort() as string[],
    fleets: [],
    platforms: [...new Set(devices.map(d => normalizePlatform(d.platform)).filter(p => p !== 'Unknown'))].sort(),
    usages: [...new Set(devices.map(d => d.usage).filter(Boolean))].sort() as string[],
  }

  // Compute device count per location for proportional pill sizing
  const locationCounts = devices.reduce((acc, d) => {
    if (d.location) {
      acc[d.location] = (acc[d.location] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  // ============ FILTERED + SORTED DATA ============

  const filteredDevices = devices.filter(d => {
    if (globalPlatformFilter !== 'all' && !isPlatformVisible(normalizePlatform(d.platform))) return false
    if (selectedStatuses.length > 0 && d.status && !selectedStatuses.includes(d.status)) return false
    if (selectedCatalogs.length > 0 && d.catalog && !selectedCatalogs.includes(d.catalog)) return false
    if (selectedLocations.length > 0 && d.location && !selectedLocations.includes(d.location)) return false
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(normalizePlatform(d.platform))) return false
    if (selectedUsages.length > 0 && d.usage && !selectedUsages.includes(d.usage)) return false
    // Widget filters
    if (encryptionFilter && (d.encryptionEnabled ? 'Encrypted' : 'Not Encrypted') !== encryptionFilter) return false
    if (protectionFilter && getProtectionLabel(d) !== protectionFilter) return false
    if (detectionFilter && ((d.detectionCount ?? 0) > 0 ? 'Threats Detected' : 'Clean') !== detectionFilter) return false
    if (firewallFilter && (d.firewallEnabled ? 'Enabled' : 'Disabled') !== firewallFilter) return false
    if (tamperingFilter && getTamperLabel(d) !== tamperingFilter) return false
    if (remoteFilter && getRemoteLabel(d) !== remoteFilter) return false
    if (certFilter && getCertLabel(d) !== certFilter) return false
    if (cveFilter && getCveLabel(d) !== cveFilter) return false
    // Certificate search filter (from grouped cert results)
    if (certFilterSerials && !certFilterSerials.has(d.serialNumber)) return false
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        d.deviceName?.toLowerCase().includes(q) ||
        d.serialNumber?.toLowerCase().includes(q) ||
        d.antivirusName?.toLowerCase().includes(q) ||
        d.autoLoginUser?.toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => {
    let av = '', bv = ''
    switch (sortColumn) {
      case 'device': av = a.deviceName?.toLowerCase() || ''; bv = b.deviceName?.toLowerCase() || ''; break
      case 'encryption': av = a.encryptionEnabled ? '1' : '0'; bv = b.encryptionEnabled ? '1' : '0'; break
      case 'protection': av = getProtectionLabel(a); bv = getProtectionLabel(b); break
      case 'detection': av = String(a.detectionCount ?? 0).padStart(5, '0'); bv = String(b.detectionCount ?? 0).padStart(5, '0'); break
      case 'firewall': av = a.firewallEnabled ? '1' : '0'; bv = b.firewallEnabled ? '1' : '0'; break
      case 'tampering': av = getTamperLabel(a); bv = getTamperLabel(b); break
      case 'remote': av = getRemoteLabel(a); bv = getRemoteLabel(b); break
      case 'certificates': av = String(a.expiredCertCount + a.expiringSoonCertCount).padStart(5, '0'); bv = String(b.expiredCertCount + b.expiringSoonCertCount).padStart(5, '0'); break
      case 'cve': av = String(a.cveCount).padStart(5, '0'); bv = String(b.cveCount).padStart(5, '0'); break
    }
    return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  // ============ CSV EXPORT ============

  const exportCSV = () => {
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`
    const headers = ['Device Name','Serial Number','Platform','Encryption','Protection Name','Protection Status','Detections','Tampering','Firewall','Access','Expired Certs','Expiring Certs','Vulnerabilities','Critical Vulnerabilities']
    const rows = filteredDevices.map(d => [
      esc(d.deviceName), esc(d.serialNumber), esc(normalizePlatform(d.platform)),
      d.encryptionEnabled ? 'Encrypted' : 'Not Encrypted',
      esc(d.antivirusName), d.antivirusEnabled ? (d.antivirusUpToDate ? 'Current' : 'Out of Date') : 'Disabled',
      d.detectionCount != null ? (d.detectionCount > 0 ? `${d.detectionCount} threat${d.detectionCount !== 1 ? 's' : ''}` : 'Clean') : '',
      isWin(d) ? `TPM ${d.tpmPresent && d.tpmEnabled ? 'On' : 'Off'} / SB ${d.secureBootEnabled ? 'On' : 'Off'}` : `SIP ${d.sipEnabled ? 'On' : 'Off'} / SB ${d.secureBootEnabled ? 'On' : 'Off'}`,
      d.firewallEnabled ? 'On' : 'Off',
      [d.secureShell?.isServiceRunning ? 'SSH' : '', isWin(d) && d.rdpEnabled ? 'RDP' : ''].filter(Boolean).join('+') || 'None',
      String(d.expiredCertCount), String(d.expiringSoonCertCount),
      String(d.cveCount), String(d.criticalCveCount),
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `security-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ============ CHART COLORS ============

  const greenRed: Record<string, string> = { 'Encrypted': '#22c55e', 'Not Encrypted': '#ef4444', 'Enabled': '#22c55e', 'Disabled': '#ef4444', 'Active': '#22c55e', 'Inactive': '#ef4444', 'Secured': '#22c55e', 'Unsecured': '#ef4444' }
  const tamperingColors: Record<string, string> = { 'Secured': '#22c55e', 'Insecure': '#ef4444' }
  const detectionColors: Record<string, string> = { 'Clean': '#22c55e', 'Threats Detected': '#ef4444' }
  const firewallColors: Record<string, string> = { 'Enabled': '#22c55e', 'Disabled': '#94a3b8' }
  const protColors: Record<string, string> = { 'Current': '#22c55e', 'Out of Date': '#f59e0b', 'Disabled': '#ef4444' }
  const remoteColors: Record<string, string> = { 'SSH + RDP': '#3b82f6', 'SSH Only': '#22c55e', 'RDP Only': '#f59e0b', 'SSH Enabled': '#22c55e', 'Disabled': '#94a3b8' }
  const certColors: Record<string, string> = { 'Valid': '#22c55e', 'Expiring Soon': '#f59e0b', 'Has Expired': '#ef4444' }
  const cveColors: Record<string, string> = { 'None': '#22c55e', 'Has CVEs': '#f59e0b', 'Critical': '#ef4444' }

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
          <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            </div>
            <LoadingSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black flex flex-col overflow-hidden">
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-0">
        <div className="flex-1 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col min-h-0 overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fleet Security</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Security posture across {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-48 md:w-64 pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={exportCSV}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Export CSV"
                >
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Selections Accordion */}
          <DeviceFilters
            filterOptions={filterOptions}
            selectedStatuses={selectedStatuses}
            selectedCatalogs={selectedCatalogs}
            selectedAreas={selectedAreas}
            selectedLocations={selectedLocations}
            selectedFleets={selectedFleets}
            selectedPlatforms={selectedPlatforms}
            selectedUsages={selectedUsages}
            onStatusToggle={toggleStatus}
            onCatalogToggle={toggleCatalog}
            onAreaToggle={toggleArea}
            onLocationToggle={toggleLocation}
            onFleetToggle={toggleFleet}
            onPlatformToggle={togglePlatform}
            onUsageToggle={toggleUsage}
            onClearAll={clearAllFilters}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            expanded={effectiveFiltersExpanded}
            onToggle={() => setFiltersExpanded(!effectiveFiltersExpanded)}
            locationCounts={locationCounts}
          />

          {/* Yellow Clear Filters Bar */}
          {hasActiveWidgetFilter && (
            <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="font-medium">Filters Active</span>
                <span className="text-yellow-600 dark:text-yellow-300">
                  {[encryptionFilter, protectionFilter, detectionFilter, firewallFilter, tamperingFilter, remoteFilter, certFilter, cveFilter].filter(Boolean).join(', ')}
                </span>
              </div>
              <button
                onClick={clearWidgetFilters}
                className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Widgets Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setWidgetsExpanded(!widgetsExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Widgets</span>
              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${effectiveWidgetsExpanded ? 'rotate-90' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <CollapsibleSection expanded={effectiveWidgetsExpanded} maxHeight="60vh">
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MiniDonut title="Encryption" data={Object.entries(encryptionCounts).map(([label, value]) => ({ label, value }))} colors={greenRed} onFilter={setEncryptionFilter} activeFilter={encryptionFilter} />
                  <MiniDonut title="Protection" data={Object.entries(protectionCounts).map(([label, value]) => ({ label, value }))} colors={protColors} onFilter={setProtectionFilter} activeFilter={protectionFilter} />
                  <MiniDonut title="Detection" data={Object.entries(detectionCounts).map(([label, value]) => ({ label, value }))} colors={detectionColors} onFilter={setDetectionFilter} activeFilter={detectionFilter} />
                  <MiniDonut title="Firewall" data={Object.entries(firewallCounts).map(([label, value]) => ({ label, value }))} colors={firewallColors} onFilter={setFirewallFilter} activeFilter={firewallFilter} />
                  <MiniDonut title="Tampering" data={Object.entries(tamperingCounts).map(([label, value]) => ({ label, value }))} colors={tamperingColors} onFilter={setTamperingFilter} activeFilter={tamperingFilter} />
                  <MiniDonut title="Access" data={Object.entries(remoteCounts).map(([label, value]) => ({ label, value }))} colors={remoteColors} onFilter={setRemoteFilter} activeFilter={remoteFilter} />
                  <MiniDonut title="Certificates" data={Object.entries(certCounts).map(([label, value]) => ({ label, value }))} colors={certColors} onFilter={setCertFilter} activeFilter={certFilter} />
                  <MiniDonut title="Vulnerabilities" data={Object.entries(cveCounts).map(([label, value]) => ({ label, value }))} colors={cveColors} onFilter={setCveFilter} activeFilter={cveFilter} />
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Certificate Search Accordion */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCertSearchExpanded(!certSearchExpanded)}
              className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Certificates</span>
                {selectedCertName && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Filtering: {selectedCertName}
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${certSearchExpanded ? 'rotate-90' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <CollapsibleSection expanded={certSearchExpanded}>
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedCertName && (
                    <button
                      onClick={() => setSelectedCertName(null)}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-lg transition-colors flex-shrink-0"
                    >
                      Clear filter
                    </button>
                  )}
                  <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search certificates (e.g. UEFI, Microsoft, DigiCert...)"
                      value={certSearchQuery}
                      onChange={(e) => setCertSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCertificates()}
                      className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {(['all', 'valid', 'expiring', 'expired'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setCertSearchStatus(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          certSearchStatus === s
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={searchCertificates}
                    disabled={certSearchLoading}
                    className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {certSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Grouped certificate results */}
                {groupedCertResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {groupedCertResults.map((group) => {
                      const isSelected = selectedCertName === group.commonName
                      return (
                        <div
                          key={group.commonName}
                          onClick={() => setSelectedCertName(isSelected ? null : group.commonName)}
                          className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 ring-1 ring-blue-300 dark:ring-blue-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-800'
                          }`}
                          title={isSelected ? 'Click to clear filter' : `Click to filter table to ${group.devices.length} device${group.devices.length !== 1 ? 's' : ''} with this certificate`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={group.commonName}>
                                {group.commonName}
                              </p>
                              {isSelected && (
                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {group.issuer && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={group.issuer}>
                                Issuer: {group.issuer}
                              </p>
                            )}
                            {isSelected && group.devices.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {group.devices.slice(0, 5).map((device) => (
                                  <Link
                                    key={device.serialNumber}
                                    href={`/device/${device.serialNumber}#security`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                                  >
                                    {device.deviceName}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </Link>
                                ))}
                                {group.devices.length > 5 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5">
                                    +{group.devices.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {group.expiredCount > 0 && (
                              <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                                {group.expiredCount} expired
                              </span>
                            )}
                            {group.expiringCount > 0 && (
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                {group.expiringCount} expiring
                              </span>
                            )}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                              {group.devices.length} device{group.devices.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                      {groupedCertResults.length} unique certificate{groupedCertResults.length !== 1 ? 's' : ''} across {certResults.length} result{certResults.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}

                {/* Empty state when search performed but no results */}
                {!certSearchLoading && certSearchPerformed && certResults.length === 0 && groupedCertResults.length === 0 && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No certificates found{certSearchQuery.trim() ? ` matching "${certSearchQuery.trim()}"` : ''}{certSearchStatus !== 'all' ? ` with status "${certSearchStatus}"` : ''}
                    </p>
                  </div>
                )}

                {selectedCertName && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <span className="text-xs text-blue-800 dark:text-blue-200">
                      Table filtered to devices with certificate: <strong>{selectedCertName}</strong>
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>

          {/* Table */}
          <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0 table-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <SortHeader label="Device" column="device" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Encryption" column="encryption" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Protection" column="protection" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Detection" column="detection" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Tampering" column="tampering" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Firewall" column="firewall" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Access" column="remote" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Certs" column="certificates" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortHeader label="Vulnerabilities" column="cve" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 mb-4 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-base font-medium text-gray-900 dark:text-white mb-2">Failed to load security data</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No security records found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((d) => {
                    const win = isWin(d)
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* Device */}
                        <td className="px-3 py-3 max-w-48">
                          <Link href={`/device/${d.serialNumber}#security`} className="group block min-w-0" title={d.deviceName || 'Unknown Device'}>
                            <div className="text-sm font-medium text-gray-900 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200 truncate">{d.deviceName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                              {d.serialNumber}
                              {d.assetTag && <span className="ml-1">| {d.assetTag}</span>}
                            </div>
                          </Link>
                        </td>
                        {/* Encryption */}
                        <td className="px-3 py-3">
                          <Badge className={d.encryptionEnabled ? greenBadge : redBadge}>
                            {win ? 'BitLocker' : 'FileVault'} {d.encryptionEnabled ? 'On' : 'Off'}
                          </Badge>
                        </td>
                        {/* Protection */}
                        <td className="px-3 py-3">
                          <Badge className={d.antivirusEnabled && d.antivirusUpToDate ? greenBadge : d.antivirusEnabled ? amberBadge : redBadge}>
                            {d.antivirusEnabled ? (d.antivirusUpToDate ? 'Current' : 'Outdated') : 'Disabled'}
                          </Badge>
                        </td>
                        {/* Detection */}
                        <td className="px-3 py-3">
                          {(() => {
                            const count = d.detectionCount ?? 0
                            return (
                              <Badge className={count === 0 ? greenBadge : redBadge}>
                                {count === 0 ? 'Clean' : `${count} threat${count !== 1 ? 's' : ''}`}
                              </Badge>
                            )
                          })()}
                        </td>
                        {/* Tampering */}
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {win ? (
                              <>
                                <Badge className={d.tpmPresent && d.tpmEnabled ? greenBadge : redBadge}>
                                  TPM {d.tpmPresent && d.tpmEnabled ? 'On' : 'Off'}
                                </Badge>
                                <Badge className={d.secureBootEnabled ? greenBadge : redBadge}>
                                  SB {d.secureBootEnabled ? 'On' : 'Off'}
                                </Badge>
                              </>
                            ) : (
                              <>
                                {d.sipEnabled !== undefined && (
                                  <Badge className={d.sipEnabled ? greenBadge : redBadge}>
                                    SIP {d.sipEnabled ? 'On' : 'Off'}
                                  </Badge>
                                )}
                                <Badge className={d.secureBootEnabled ? greenBadge : redBadge}>
                                  SB {d.secureBootEnabled ? 'On' : 'Off'}
                                </Badge>
                              </>
                            )}
                          </div>
                        </td>
                        {/* Firewall */}
                        <td className="px-3 py-3">
                          <Badge className={grayBadge}>
                            {d.firewallEnabled ? 'On' : 'Off'}
                          </Badge>
                        </td>
                        {/* Access */}
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {d.secureShell?.isServiceRunning && (
                              <Badge className={grayBadge}>SSH</Badge>
                            )}
                            {win && d.rdpEnabled && (
                              <Badge className={grayBadge}>RDP</Badge>
                            )}
                            {!d.secureShell?.isServiceRunning && !(win && d.rdpEnabled) && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </td>
                        {/* Certificates */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {d.expiredCertCount > 0 && (
                              <Badge className={redBadge}>{d.expiredCertCount}</Badge>
                            )}
                            {d.expiringSoonCertCount > 0 && (
                              <Badge className={amberBadge}>{d.expiringSoonCertCount}</Badge>
                            )}
                            {d.expiredCertCount === 0 && d.expiringSoonCertCount === 0 && (
                              <span className="text-xs text-green-600 dark:text-green-400">OK</span>
                            )}
                          </div>
                        </td>
                        {/* Vulnerabilities */}
                        <td className="px-3 py-3">
                          {d.cveCount > 0 ? (
                            <div className="flex items-center gap-1">
                              {d.criticalCveCount > 0 && (
                                <Badge className={redBadge}>{d.criticalCveCount}C</Badge>
                              )}
                              <span className="text-xs text-gray-600 dark:text-gray-400">{d.cveCount}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400">None</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-black animate-pulse"></div>}>
      <SecurityPageContent />
    </Suspense>
  )
}
