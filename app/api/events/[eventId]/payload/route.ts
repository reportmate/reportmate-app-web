import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

const AZURE_FUNCTIONS_BASE_URL = process.env.AZURE_FUNCTIONS_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    console.log('[EVENT PAYLOAD API] Fetching payload for event:', eventId)

    // Try to fetch from Azure Functions first
    try {
      const response = await fetch(`${AZURE_FUNCTIONS_BASE_URL}/api/events/${encodeURIComponent(eventId)}/payload`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[EVENT PAYLOAD API] Successfully fetched payload from Azure Functions');
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } else {
        console.log('[EVENT PAYLOAD API] Azure Functions API error:', response.status, response.statusText);
        // Fall through to local fallback
      }
    } catch (fetchError) {
      console.log('[EVENT PAYLOAD API] Azure Functions API fetch error:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      // Fall through to local fallback
    }

    // Local fallback - simulate full payload for sample events
    console.log('[EVENT PAYLOAD API] Using local fallback for event:', eventId);
    
    // Sample payloads based on eventId patterns
    let fullPayload = {};
    
    if (eventId.includes('sample-evt-001')) {
      fullPayload = {
        metadata: {
          deviceId: "79349310-287D-8166-52FC-0644E27378F7",
          serialNumber: "0F33V9G25083HJ",
          collectedAt: "2025-07-27T14:22:15.123Z",
          clientVersion: "2025.7.22.0",
          platform: "windows",
          collectionType: "Full",
          enabledModules: ["inventory", "system", "hardware", "network", "security", "applications", "displays", "management"]
        },
        modules: {
          inventory: {
            assetTag: "A004733",
            deviceName: "Rod Christiansen", 
            manufacturer: "Microsoft Corporation",
            model: "Surface Laptop Studio 2",
            serialNumber: "0F33V9G25083HJ",
            operatingSystem: "Microsoft Windows 11 Enterprise"
          },
          system: {
            operatingSystem: {
              name: "Microsoft Windows 11 Enterprise",
              version: "10.0.22631",
              build: "22631",
              architecture: "x64"
            },
            uptime: "9 days, 23 hours, 45 minutes",
            bootTime: "2025-07-17T15:30:00.000Z",
            timeZone: "Pacific Standard Time",
            totalMemory: "32.0 GB",
            availableMemory: "18.2 GB"
          },
          hardware: {
            processor: "Snapdragon X Elite - X1E80100 @ 3.40 GHz",
            memory: "32.0 GB",
            storage: [
              {
                drive: "C:",
                totalSize: "953.9 GB",
                freeSpace: "421.3 GB",
                fileSystem: "NTFS"
              }
            ],
            graphics: [
              {
                name: "Qualcomm Adreno GPU",
                driverVersion: "31.0.101.5590",
                memory: "Shared Memory"
              }
            ]
          },
          network: {
            interfaces: [
              {
                name: "Ethernet",
                type: "Ethernet",
                status: "Up",
                ipAddress: "192.168.1.101",
                macAddress: "00:15:5D:01:02:03",
                speed: "1000 Mbps"
              },
              {
                name: "Wi-Fi",
                type: "Wireless",
                status: "Connected",
                ipAddress: "192.168.1.102",
                macAddress: "A4:B1:C2:D3:E4:F5",
                speed: "866 Mbps",
                ssid: "CorpNetwork"
              }
            ]
          },
          security: {
            antivirus: {
              name: "Windows Defender",
              status: "Enabled",
              lastUpdate: "2025-07-27T08:00:00.000Z",
              version: "1.419.312.0"
            },
            firewall: {
              status: "Enabled",
              profile: "Domain"
            },
            encryption: {
              bitlocker: "Enabled",
              tpmVersion: "2.0"
            }
          }
        }
      };
    } else if (eventId.includes('sample-evt-002')) {
      fullPayload = {
        metadata: {
          deviceId: "79349310-287D-8166-52FC-0644E27378F7",
          serialNumber: "0F33V9G25083HJ",
          collectedAt: "2025-07-27T14:52:15.456Z",
          clientVersion: "2025.7.22.0",
          platform: "windows",
          collectionType: "Partial",
          enabledModules: ["inventory", "system"]
        },
        modules: {
          inventory: {
            assetTag: "A004733",
            deviceName: "Rod Christiansen",
            location: "Remote Office"
          },
          system: {
            uptime: "9 days, 23 hours, 45 minutes",
            currentUser: "rchristiansen",
            processCount: 234,
            services: {
              running: 156,
              stopped: 78,
              total: 234
            }
          }
        }
      };
    } else {
      // Generic payload for other events
      fullPayload = {
        message: 'Event payload data',
        component: 'reportmate-client',
        timestamp: new Date().toISOString(),
        details: {
          eventId: eventId,
          source: 'local-fallback',
          note: 'This is sample payload data'
        }
      };
    }

    return NextResponse.json({
      success: true,
      eventId: eventId,
      payload: fullPayload,
      source: 'local-fallback'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[EVENT PAYLOAD API] Error fetching event payload:', error);
    return NextResponse.json({
      error: 'Failed to fetch event payload',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
