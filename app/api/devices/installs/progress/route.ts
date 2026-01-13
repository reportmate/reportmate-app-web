import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const API_BASE_URL = process.env.API_BASE_URL;

  if (!API_BASE_URL) {
    return NextResponse.json({ error: 'API_BASE_URL environment variable is required' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId') || Date.now().toString();

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;
      let aborted = false;
      
      const sendEvent = (data: any) => {
        if (isClosed || aborted) {
          return;
        }
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('[INSTALLS PROGRESS API] Error sending event:', error);
          isClosed = true;
        }
      };

      const closeStream = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch (error) {
            console.error('[INSTALLS PROGRESS API] Error closing controller:', error);
          }
        }
      };

      // Handle client disconnection
      request.signal?.addEventListener('abort', () => {
        aborted = true;
        closeStream();
      });

      const processInstallsWithProgress = async () => {
        try {
          // Send initial progress
          sendEvent({ 
            stage: 'discovering', 
            sessionId,
            deviceCount: 0, 
            processedDevices: 0, 
            currentDevice: null, 
            totalInstalls: 0,
            startTime: Date.now()
          });

          const timestamp = new Date().toISOString();
          // Fetch all devices first
          const apiResponse = await fetch(`${API_BASE_URL}/api/devices`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'User-Agent': 'ReportMate-Frontend/1.0'
            }
          });

          if (!apiResponse.ok) {
            sendEvent({ 
              stage: 'error', 
              sessionId,
              error: 'Failed to fetch devices list',
              deviceCount: 0,
              processedDevices: 0
            });
            closeStream();
            return;
          }
          
          const devicesData = await apiResponse.json();
          const devices = Array.isArray(devicesData) ? devicesData : [];
          
          // Send discovery complete
          sendEvent({ 
            stage: 'fetching', 
            sessionId,
            deviceCount: devices.length, 
            processedDevices: 0, 
            currentDevice: null, 
            totalInstalls: 0,
            startTime: Date.now()
          });

          const batchSize = 10;
          const results: any[] = [];
          let totalInstalls = 0;

          for (let i = 0; i < devices.length; i += batchSize) {
            const batch = devices.slice(i, i + batchSize);
            const batchNumber = Math.floor(i/batchSize) + 1;
            const totalBatches = Math.ceil(devices.length/batchSize);
            
            })`);
            
            const batchPromises = batch.map(async (device: any, index: number) => {
              // Check if client has disconnected
              if (aborted) {
                return null;
              }
              
              const serialNumber = device.serialNumber;
              const deviceIdentifier = serialNumber || device.deviceId || `device-${i + index}`;
              
              // Send current device update
              sendEvent({ 
                stage: 'fetching', 
                sessionId,
                deviceCount: devices.length, 
                processedDevices: i + index, 
                currentDevice: device.deviceName || device.name || deviceIdentifier, 
                totalInstalls,
                startTime: Date.now()
              });

              if (!serialNumber) {
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
                const deviceApiResponse = await fetch(`${API_BASE_URL}/api/device/${encodeURIComponent(serialNumber)}`, {
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'ReportMate-Frontend/1.0'
                  },
                  signal: AbortSignal.timeout(30000)
                });

                if (!deviceApiResponse.ok) {
                  return {
                    deviceId: device.deviceId,
                    deviceName: device.deviceName || device.name || 'Unknown Device',
                    serialNumber: serialNumber,
                    lastSeen: device.lastSeen,
                    status: device.status || 'error',
                    installs: {
                      cimian: {
                        status: 'Failed to fetch',
                        isInstalled: false,
                        items: [],
                        events: [],
                        sessions: []
                      }
                    },
                    raw: {},
                    error: `API Error: ${deviceApiResponse.status}`,
                    hasError: true
                  };
                }

                const deviceData = await deviceApiResponse.json();
                const installsData = deviceData?.device?.modules?.installs || {};
                
                // Count installs for this device
                const deviceInstallCount = (installsData.cimian?.items?.length || 0) + 
                                         (installsData.munki?.items?.length || 0);
                totalInstalls += deviceInstallCount;

                return {
                  deviceId: device.deviceId,
                  deviceName: device.deviceName || device.name || 'Unknown Device', 
                  serialNumber: serialNumber,
                  lastSeen: device.lastSeen,
                  status: device.status || 'active',
                  installs: installsData,
                  // Add direct access to raw data for version extraction
                  raw: deviceData?.device?.modules || {},
                  hasError: false
                };

              } catch (error) {
                console.error(`[INSTALLS PROGRESS API] Error fetching device ${serialNumber}:`, error);
                return {
                  deviceId: device.deviceId,
                  deviceName: device.deviceName || device.name || 'Unknown Device',
                  serialNumber: serialNumber,
                  lastSeen: device.lastSeen,
                  status: device.status || 'error',
                  installs: {
                    cimian: {
                      status: 'Error',
                      isInstalled: false,
                      items: [],
                      events: [],
                      sessions: []
                    }
                  },
                  raw: {},
                  error: error instanceof Error ? error.message : 'Unknown error',
                  hasError: true
                };
              }
            });

            const batchResults = await Promise.all(batchPromises);
            // Filter out null results from aborted processing
            const validResults = batchResults.filter(result => result !== null);
            results.push(...validResults);
            
            // Check if processing was aborted
            if (aborted) {
              break;
            }
            
            // Send batch complete update
            sendEvent({ 
              stage: 'fetching', 
              sessionId,
              deviceCount: devices.length, 
              processedDevices: Math.min(i + batchSize, devices.length), 
              currentDevice: null, 
              totalInstalls,
              startTime: Date.now()
            });
          }

          // Send aggregating stage
          sendEvent({ 
            stage: 'aggregating', 
            sessionId,
            deviceCount: devices.length, 
            processedDevices: devices.length, 
            currentDevice: null, 
            totalInstalls,
            startTime: Date.now()
          });

          // Send final result
          sendEvent({ 
            stage: 'complete', 
            sessionId,
            deviceCount: devices.length, 
            processedDevices: devices.length, 
            totalInstalls,
            startTime: Date.now(),
            data: results
          });

          closeStream();

        } catch (error) {
          console.error('[INSTALLS PROGRESS API] Error:', error);
          sendEvent({ 
            stage: 'error', 
            sessionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          closeStream();
        }
      };

      processInstallsWithProgress();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
