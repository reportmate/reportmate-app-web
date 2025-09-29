import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');
    
    // If device ID is provided, return data for specific device
    if (deviceId) {
      const timestamp = new Date().toISOString();
      console.log(`[INSTALLS API] ${timestamp} - Fetching installs data for device: ${deviceId}`);

      // Fetch device data from Azure Functions device endpoint
      const apiResponse = await fetch(`${API_BASE_URL}/api/device/${encodeURIComponent(deviceId)}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'User-Agent': 'ReportMate-Frontend/1.0'
        }
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
      
      // Extract installs data from the device response
      const installsData = deviceData?.device?.modules?.installs || {};
      
      // Return the installs data
      return NextResponse.json({
        success: true,
        deviceId: deviceId,
        data: installsData,
        timestamp: timestamp
      });
    }

    // No device ID - return installs data for all devices
    const timestamp = new Date().toISOString();
    console.log(`[INSTALLS API] ${timestamp} - Fetching installs data for all devices`);
    
    // Fetch all devices from Azure Functions
    const apiResponse = await fetch(`${API_BASE_URL}/api/devices`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
    });

    if (!apiResponse.ok) {
      console.error('[INSTALLS API] API fetch failed for all devices:', apiResponse.status, apiResponse.statusText);
      
      // Following .instructions.md: NO FAKE DATA - return empty state for broken backend
      console.log('[INSTALLS API] Backend unavailable, returning empty state (NO FAKE DATA)');
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Backend API unavailable - showing empty state (NO FAKE DATA)',
        backendStatus: apiResponse.status
      });
    }
    
    const devicesData = await apiResponse.json();
    console.log(`[INSTALLS API] Raw API response received for ${Array.isArray(devicesData) ? devicesData.length : 0} devices`);
    
    // Get the list of devices
    const devices = Array.isArray(devicesData) ? devicesData : [];
    
    // Process devices in smaller batches to avoid overwhelming the API
    const batchSize = 10; // Process 10 devices at a time
    const results: any[] = [];
    
    console.log(`[INSTALLS API] Fetching installs data for ${devices.length} devices in batches of ${batchSize}...`);
    
    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      console.log(`[INSTALLS API] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(devices.length/batchSize)} (devices ${i + 1}-${Math.min(i + batchSize, devices.length)})`);
      
      const batchPromises = batch.map(async (device: any, index: number) => {
        // Use serialNumber (not deviceId) for Azure Functions API calls
        const serialNumber = device.serialNumber;
        const deviceIdentifier = serialNumber || device.deviceId || `device-${i + index}`;
        
        if (!serialNumber) {
          console.warn(`[INSTALLS API] Device missing serialNumber: ${device.deviceId || 'unknown'}`);
          return {
            deviceId: device.deviceId || 'unknown',
            deviceName: device.deviceName || device.name || 'Unknown Device',
            serialNumber: 'Unknown',
            lastSeen: device.lastSeen,
            status: device.status || 'error',
            installs: {
              cimian: {
                status: 'Not Available',
                isInstalled: false,
                items: [],
                events: [],
                sessions: []
              }
            },
            raw: {},
            error: 'Missing serial number',
            hasError: true
          };
        }

        try {
          // Use the same Azure Functions endpoint that works for single device installs
          // CRITICAL: Use serialNumber (not deviceId) as that's what works for /api/device/{serialNumber}
          const deviceApiResponse = await fetch(`${API_BASE_URL}/api/device/${encodeURIComponent(serialNumber)}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'User-Agent': 'ReportMate-Frontend/1.0'
            },
            // Increase timeout for better reliability
            signal: AbortSignal.timeout(30000) // 30 second timeout per device
          });

          if (!deviceApiResponse.ok) {
            console.warn(`[INSTALLS API] Failed to fetch device ${serialNumber}: ${deviceApiResponse.status}`);
            return {
              deviceId: device.deviceId,
              deviceName: device.deviceName || device.name || 'Unknown Device',
              serialNumber: serialNumber,
              lastSeen: device.lastSeen,
              status: device.status || 'error',
              installs: {
                cimian: {
                  status: 'API Error',
                  isInstalled: false,
                  items: [],
                  events: [],
                  sessions: []
                }
              },
              raw: {},
              error: `API error: ${deviceApiResponse.status}`,
              hasError: true
            };
          }

          const deviceData = await deviceApiResponse.json();
          const installsData = deviceData?.device?.modules?.installs || {
            cimian: {
              status: 'No Data',
              isInstalled: false,
              items: [],
              events: [],
              sessions: []
            }
          };

          return {
            deviceId: device.deviceId,
            deviceName: device.deviceName || device.name || deviceData?.device?.modules?.inventory?.deviceName || deviceData?.device?.deviceName || 'Unknown Device',
            serialNumber: serialNumber,
            lastSeen: device.lastSeen || deviceData?.device?.lastSeen,
            status: device.status || deviceData?.device?.status || 'unknown',
            installs: installsData,
            // Add direct access to raw data for version extraction
            raw: deviceData?.device?.modules || {},
            hasError: false
          };

        } catch (error) {
          // Distinguish between timeout and other errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('aborted');
          
          console.error(`[INSTALLS API] Error fetching device ${serialNumber}: ${errorMessage}`);
          return {
            deviceId: device.deviceId,
            deviceName: device.deviceName || device.name || 'Unknown Device',
            serialNumber: serialNumber,
            lastSeen: device.lastSeen,
            status: device.status || 'error',
            installs: {
              cimian: {
                status: isTimeout ? 'Timeout' : 'Error',
                isInstalled: false,
                items: [],
                events: [],
                sessions: []
              }
            },
            raw: {},
            error: errorMessage,
            hasError: true
          };
        }
      });

      // Wait for this batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Brief pause between batches to be gentle on the API
      if (i + batchSize < devices.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms pause
      }
    }
    
    // Separate successful and failed devices
    const successfulInstalls = results.filter(device => !device.hasError);
    const failedInstalls = results.filter(device => device.hasError);
    
    console.log(`[INSTALLS API] Successfully fetched installs for ${successfulInstalls.length}/${devices.length} devices`);
    if (failedInstalls.length > 0) {
      console.warn(`[INSTALLS API] Failed to fetch installs for ${failedInstalls.length} devices:`, 
        failedInstalls.map(d => d.deviceId || d.serialNumber).slice(0, 5) // Log first 5 failures
      );
    }

    // Return all data, including devices with errors (showing them with error states)
    return NextResponse.json({
      success: true,
      data: results, // Include all devices, even those with errors for UI handling
      count: results.length,
      successCount: successfulInstalls.length,
      errorCount: failedInstalls.length,
      timestamp: timestamp,
      message: failedInstalls.length === 0 
        ? `Successfully fetched installs data for all ${devices.length} devices`
        : `Fetched installs data for ${successfulInstalls.length}/${devices.length} devices (${failedInstalls.length} errors)`,
      // Provide error summary for debugging
      errors: failedInstalls.length > 0 ? failedInstalls.map(d => ({
        deviceId: d.deviceId,
        serialNumber: d.serialNumber,
        error: d.error
      })).slice(0, 10) : undefined // Only show first 10 errors in response
    });
    
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
