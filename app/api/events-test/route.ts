import { NextResponse } from 'next/server';

export async function GET() {
  // Sample events with different payload types to test the formatting
  const sampleEvents = [
    {
      id: 'evt-001',
      device: '0F33V9G25083HJ',
      kind: 'system',
      ts: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      payload: {
        modules: {
          inventory: {
            uuid: "79349310-287D-8166-52FC-0644E27378F7",
            owner: "rchristiansen",
            assetTag: "A004733",
            deviceName: "Rod Christiansen"
          },
          system: {
            operatingSystem: {
              name: "Microsoft Windows 11 Enterprise",
              build: "26100",
              architecture: "ARM 64-bit Processor"
            },
            uptime: "9 days, 23 hours, 9 minutes"
          },
          hardware: {
            processor: "Snapdragon(R) X Elite - X1E78100 - Oryon CPU @ 3.42 GHz",
            memory: "32.0 GB",
            storage: "1 TB SSD"
          },
          network: {
            interfaces: ["Ethernet", "Wi-Fi"],
            connections: 2
          },
          security: {
            antivirus: "Windows Defender",
            firewall: "Enabled"
          }
        },
        clientVersion: "2025.7.22.0",
        transmissionSize: "45.2KB"
      }
    },
    {
      id: 'evt-002',
      device: '0F33V9G25083HJ', 
      kind: 'info',
      ts: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      payload: {
        modules: {
          inventory: {
            uuid: "79349310-287D-8166-52FC-0644E27378F7",
            owner: "rchristiansen",
            assetTag: "A004733"
          },
          system: {
            uptime: "9 days, 23 hours, 9 minutes",
            bootTime: "2025-07-17T22:20:21.3983894Z"
          }
        },
        clientVersion: "2025.7.22.0"
      }
    },
    {
      id: 'evt-003',
      device: '0F33V9G25083HJ',
      kind: 'success',
      ts: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      payload: {
        message: 'Data transmission successful',
        transmissionSize: '2.3KB',
        component: 'reportmate-client'
      }
    },
    {
      id: 'evt-004',
      device: 'ABC123DEF456',
      kind: 'warning',
      ts: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      payload: {
        message: 'Low disk space detected',
        component: 'system-monitor',
        diskUtilization: 85,
        availableSpace: '2.1GB'
      }
    },
    {
      id: 'evt-005',
      device: 'XYZ789QRS012',
      kind: 'error',
      ts: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      payload: {
        message: 'Failed to connect to management server',
        component: 'network-client',
        error: 'Connection timeout after 30 seconds',
        retryAttempt: 3
      }
    }
  ];

  return NextResponse.json({
    success: true,
    events: sampleEvents,
    count: sampleEvents.length
  });
}
