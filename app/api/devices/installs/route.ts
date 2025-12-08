import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getDevicesWithInstalls, parseInventory } from './shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Allow up to 60 seconds for this endpoint (fetches 349+ devices)
export const maxDuration = 60;

export async function GET(request: Request) {
  // LOCALHOST BYPASS: Skip auth check for local development
  const isLocalhost = request.headers.get('host')?.includes('localhost') || process.env.NODE_ENV === 'development'
  
  // Check authentication (skip for localhost)
  if (!isLocalhost) {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 })
    }
  }

  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');
    
    // Get filter parameters from query string (normalize to lowercase for comparison)
    const selectedInstalls = searchParams.getAll('installs');
    const selectedUsages = searchParams.getAll('usages').map(u => u.toLowerCase());
    const selectedCatalogs = searchParams.getAll('catalogs').map(c => c.toLowerCase());
    const selectedRooms = searchParams.getAll('rooms');
    const selectedFleets = searchParams.getAll('fleets');
    const selectedPlatforms = searchParams.getAll('platforms').map(p => p.toLowerCase());
    
    console.log('[INSTALLS API] Filters:', {
      installs: selectedInstalls.length,
      usages: selectedUsages.length,
      catalogs: selectedCatalogs.length,
      rooms: selectedRooms.length,
      fleets: selectedFleets.length,
      platforms: selectedPlatforms.length
    });
    
    // If device ID is provided, return data for specific device
    if (deviceId) {
      const timestamp = new Date().toISOString();
      console.log(`[INSTALLS API] ${timestamp} - Fetching installs data for device: ${deviceId}`);

      // Build headers with authentication (matching shared.ts pattern)
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      };
      
      if (process.env.REPORTMATE_PASSPHRASE) {
        headers['X-API-PASSPHRASE'] = process.env.REPORTMATE_PASSPHRASE;
      } else {
        const managedIdentityId = process.env.AZURE_CLIENT_ID || process.env.MSI_CLIENT_ID;
        if (managedIdentityId) {
          headers['X-MS-CLIENT-PRINCIPAL-ID'] = managedIdentityId;
        }
      }

      // Fetch device data from Azure Functions device endpoint
      const apiResponse = await fetch(`${API_BASE_URL}/api/device/${encodeURIComponent(deviceId)}`, {
        cache: 'no-store',
        headers
      });
      
      if (!apiResponse.ok) {
        console.error('[INSTALLS API] API fetch failed:', apiResponse.status, apiResponse.statusText);
        
        // Following .instructions.md: NO FAKE DATA - return empty state for broken backend
        console.log('[INSTALLS API] Backend unavailable, returning empty state (NO FAKE DATA)');
        return NextResponse.json({
          success: true,
          deviceId: deviceId,
          data: {
            hasInstallsModule: false,
            hasRecentInstalls: false,
            recentInstallsCount: 0,
            recentInstalls: [],
            cacheSize: 0
          },
          message: 'Backend API unavailable - showing empty state (NO FAKE DATA)',
          backendStatus: apiResponse.status
        });
      }
      
      const deviceData = await apiResponse.json();
      console.log('[INSTALLS API] Raw API response received for device:', deviceId);
      
      // Extract installs data from the device response (new API format)
      // Data is now at root level: deviceData.modules.installs
      const installsData = deviceData?.modules?.installs || {};
      
      // Return the installs data
      return NextResponse.json({
        success: true,
        deviceId: deviceId,
        data: installsData,
        timestamp: timestamp
      });
    }

    // No device ID - use the shared data fetcher directly (no HTTP call needed)
    const timestamp = new Date().toISOString();
    console.log(`[INSTALLS API] ${timestamp} - Fetching installs data using shared module`);
    
    // Direct function call - no internal HTTP request, no middleware interception
    const dataResult = await getDevicesWithInstalls();
    const devicesWithInstalls = dataResult.devices || [];
    
    console.log(`[INSTALLS API] Received ${devicesWithInstalls.length} devices with installs data`);
    
    // Debug: log first device structure
    if (devicesWithInstalls.length > 0) {
      const firstDevice = devicesWithInstalls[0];
      console.log(`[INSTALLS API] First device:`, {
        serial: firstDevice.serialNumber,
        hasModules: !!firstDevice.modules,
        hasInstalls: !!firstDevice.modules?.installs,
        hasCimian: !!firstDevice.modules?.installs?.cimian,
        itemsCount: firstDevice.modules?.installs?.cimian?.items?.length || 0
      });
    }

    // Transform device data into install records for the report
    const installRecords: any[] = [];
    
    for (const device of devicesWithInstalls) {
      // Data endpoint returns modules.installs and modules.inventory
      const cimianItems = device.modules?.installs?.cimian?.items || [];
      const inventory = device.modules?.inventory || {};
      
      // Use shared parseInventory function
      const parsedInventory = parseInventory(inventory);
      
      // Filter by selected installs (case-insensitive)
      const selectedInstallsLower = selectedInstalls.map(i => i.toLowerCase());
      const filteredItems = (selectedInstalls.length > 0
        ? cimianItems.filter((item: any) => {
            const itemName = item.itemName || item.displayName || item.name;
            return itemName && selectedInstallsLower.includes(itemName.toLowerCase());
          })
        : cimianItems).filter((item: any) => {
          // Always filter out internal managed_apps and managed_profiles items
          const itemName = item.itemName || item.displayName || item.name;
          const itemType = item.type || item.itemType || item.group;
          
          // Filter by name
          if (itemName === 'managed_apps' || itemName === 'managed_profiles') return false;
          
          // Filter by type/group
          if (itemType === 'managed_apps' || itemType === 'managed_profiles') return false;
          
          return true;
        });
      
      // Create a record for each install item
      for (const item of filteredItems) {
        const usage = parsedInventory?.usage || '';
        const catalog = parsedInventory?.catalog || '';
        const room = parsedInventory?.location || '';
        const fleet = parsedInventory?.fleet || parsedInventory?.department || '';
        const assetTag = parsedInventory?.assetTag || '';
        const deviceName = parsedInventory?.deviceName || device.deviceName || device.serialNumber || 'Unknown Device';
        
        // Apply inventory filters
        if (selectedUsages.length > 0 && !selectedUsages.includes(usage.toLowerCase())) continue;
        if (selectedCatalogs.length > 0 && !selectedCatalogs.includes(catalog.toLowerCase())) continue;
        if (selectedRooms.length > 0 && !selectedRooms.includes(room)) continue;
        if (selectedFleets.length > 0 && !selectedFleets.includes(fleet)) continue;
        
        installRecords.push({
          id: `${device.serialNumber}-${item.id || item.itemName}`,
          deviceId: device.deviceId,
          deviceName,
          serialNumber: device.serialNumber,
          assetTag,
          lastSeen: device.lastSeen,
          name: item.itemName || item.displayName || item.name,
          version: item.latestVersion || item.installedVersion || '',
          status: item.currentStatus?.toLowerCase() || 'unknown',
          source: 'cimian',
          usage,
          catalog,
          room,
          fleet,
          platform: (() => {
            const p = device.modules?.system?.operatingSystem?.platform || device.modules?.inventory?.platform || device.platform || '';
            if (p === 'Windows NT' || p.toLowerCase().includes('windows')) return 'Windows';
            if (p === 'Darwin' || p.toLowerCase().includes('mac')) return 'Macintosh';
            return p || 'Unknown';
          })(),
          raw: device
        });
      }
    }
    
    console.log(`[INSTALLS API] Generated ${installRecords.length} install records from ${devicesWithInstalls.length} devices`);
    
    // Return install records (not raw device data)
    return NextResponse.json(installRecords);
    
  } catch (error) {
    console.error('[INSTALLS API] Error:', error);
    
    // Following .instructions.md: NO FAKE DATA - return empty state for errors
    const deviceId = new URL(request.url).searchParams.get('id');
    
    if (deviceId) {
      // Single device error
      return NextResponse.json({
        success: true,
        deviceId: deviceId,
        data: {
          hasInstallsModule: false,
          hasRecentInstalls: false,
          recentInstallsCount: 0,
          recentInstalls: [],
          cacheSize: 0
        },
        message: 'Error occurred - showing empty state (NO FAKE DATA)',
        error: error instanceof Error ? error.message : String(error)
      });
    } else {
      // Bulk devices error
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Error occurred - showing empty state (NO FAKE DATA)',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
