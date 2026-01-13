import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache for processed filter data
let cachedFiltersData: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch install records from FastAPI bulk endpoint
 * Uses /api/devices/installs/full for complete device structure with config data
 */
async function fetchBulkInstallRecords(API_BASE_URL: string): Promise<any[]> {
  ');
  
  // Use shared auth headers for internal API calls
  const headers = getInternalApiHeaders();
  
  const response = await fetch(`${API_BASE_URL}/api/devices/installs/full`, {
    cache: 'no-store',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch bulk installs: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // FastAPI endpoint returns array of devices directly
  const records = Array.isArray(data) ? data : (Array.isArray(data.devices) ? data.devices : []);
  
  return records;
}

export async function GET(request: Request) {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api';

  try {
    // Check cache first
    if (cachedFiltersData && (Date.now() - cachedFiltersData.timestamp) < CACHE_TTL) {
      return NextResponse.json(cachedFiltersData.data);
    }

    // Fetch full device records from optimized FastAPI endpoint
    const devices = await fetchBulkInstallRecords(API_BASE_URL);
    
    const managed = new Set<string>();
    const usages = new Set<string>();
    const catalogs = new Set<string>();
    const rooms = new Set<string>();
    const fleets = new Set<string>();
    const platforms = new Set<string>();
    const softwareRepos = new Set<string>();
    const manifests = new Set<string>();
    
    // Process device records to extract filter options
    for (const device of devices) {
      // Extract managed install names from cimian items
      const cimianItems = device.modules?.installs?.cimian?.items || [];
      for (const item of cimianItems) {
        const name = item.itemName || item.displayName;
        if (name && name !== 'managed_apps' && name !== 'managed_profiles') {
          managed.add(name.trim());
        }
      }
      
      // Extract inventory fields
      const inv = device.modules?.inventory || {};
      if (inv.usage) usages.add(inv.usage);
      if (inv.catalog) catalogs.add(inv.catalog);
      if (inv.location) rooms.add(inv.location);
      if (inv.fleet) fleets.add(inv.fleet);
      
      // Extract platform
      const sys = device.modules?.system || {};
      const osInfo = sys.operatingSystem || {};
      if (device.platform) {
        const normalizedPlatform = device.platform === 'Darwin' ? 'Macintosh' 
          : device.platform === 'Windows NT' ? 'Windows' 
          : device.platform;
        platforms.add(normalizedPlatform);
      } else if (osInfo.platform) {
        platforms.add(osInfo.platform);
      }
      
      // Extract software repo URLs from cimian config
      const config = device.modules?.installs?.cimian?.config || {};
      if (config.SoftwareRepoURL) softwareRepos.add(config.SoftwareRepoURL);
      if (config.softwareRepoUrl) softwareRepos.add(config.softwareRepoUrl);
      
      // Extract manifest from config  
      if (config.ClientIdentifier) manifests.add(config.ClientIdentifier);
      if (config.clientIdentifier) manifests.add(config.clientIdentifier);
    }

    const responseData = {
      success: true,
      managedInstalls: Array.from(managed).sort(),
      otherInstalls: [],
      usages: Array.from(usages).sort(),
      catalogs: Array.from(catalogs).sort(),
      rooms: Array.from(rooms).sort(),
      fleets: Array.from(fleets).sort(),
      platforms: Array.from(platforms).sort(),
      softwareRepos: Array.from(softwareRepos).sort(),
      manifests: Array.from(manifests).sort(),
      devicesWithData: devices.length,
      // Include full device data - already in correct nested structure
      devices: devices
    };

    // Cache the response
    cachedFiltersData = {
      data: responseData,
      timestamp: Date.now()
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[INSTALLS FILTERS] Failed to build filter payload', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
