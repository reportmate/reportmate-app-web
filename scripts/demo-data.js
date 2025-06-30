#!/usr/bin/env node

// Enhanced demo data generator for the improved ReportMate Dashboard
// Run with: node scripts/demo-improved.js

const devices = [
  'server-01', 'server-02', 'workstation-A', 'workstation-B', 'laptop-001',
  'sensor-12', 'sensor-13', 'vehicle-07', 'vehicle-08',
  'monitoring-agent', 'backup-system', 'router-main', 'database-primary'
];

const eventTypes = ['info', 'warning', 'error', 'success', 'ping', 'system'];

const samplePayloads = {
  info: [
    { message: "System startup complete", boot_time: "45s", cpu_usage: "12%" },
    { message: "Backup completed successfully", files_backed_up: 1247, size: "2.3GB" },
    { message: "Software update available", version: "2.1.4", severity: "low" },
    { message: "Network connection established", ip: "192.168.1.100", speed: "1Gbps" }
  ],
  warning: [
    { message: "High memory usage detected", memory_usage: "89%", threshold: "85%" },
    { message: "Disk space running low", available: "2.1GB", total: "50GB" },
    { message: "Service response time elevated", avg_response: "450ms", target: "200ms" },
    { message: "Certificate expiring soon", expires_in: "14 days", certificate: "ssl-cert.pem" }
  ],
  error: [
    { error: "Database connection failed", retries: 3, last_attempt: "2025-06-20T10:30:00Z" },
    { error: "Service health check failed", endpoint: "/health", status_code: 503 },
    { error: "Authentication service unreachable", timeout: "30s", attempts: 5 },
    { error: "Critical process stopped", process: "data-processor", exit_code: 1 }
  ],
  success: [
    { message: "Deployment completed successfully", version: "v2.1.0", duration: "3m 45s" },
    { message: "Data synchronization complete", records_synced: 15420, errors: 0 },
    { message: "Security scan passed", vulnerabilities: 0, scan_time: "12m 30s" },
    { message: "Performance test completed", avg_latency: "45ms", success_rate: "99.9%" }
  ],
  ping: [
    { status: "healthy", response_time: "15ms", uptime: "99.9%" },
    { status: "degraded", response_time: "250ms", uptime: "98.2%" },
    { status: "recovering", response_time: "120ms", uptime: "97.8%" }
  ],
  system: [
    { message: "Scheduled maintenance starting", window: "02:00-04:00 UTC", impact: "minimal" },
    { message: "Cache cleared successfully", size_freed: "1.2GB", performance_gain: "15%" },
    { message: "Log rotation completed", logs_archived: 45, space_freed: "890MB" },
    { message: "System metrics collected", cpu: "23%", memory: "67%", disk: "43%" }
  ]
};

function generateEvent() {
  const device = devices[Math.floor(Math.random() * devices.length)];
  const kind = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const payloads = samplePayloads[kind];
  const payload = payloads[Math.floor(Math.random() * payloads.length)];
  
  // Add some randomness to make events feel more realistic
  const basePayload = { ...payload };
  
  // Add contextual information
  if (Math.random() > 0.7) {
    basePayload.region = ['us-west-2', 'us-east-1', 'eu-west-1', 'ap-southeast-1'][Math.floor(Math.random() * 4)];
  }
  
  if (Math.random() > 0.8) {
    basePayload.correlation_id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  return {
    id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    device,
    kind,
    ts: new Date().toISOString(),
    payload: basePayload
  };
}

async function sendEvent(event) {
  try {
    const response = await fetch('http://localhost:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`[${event.kind.toUpperCase()}] ${event.device}: ${event.payload.message || event.payload.error || 'Event sent'}`);
      return result;
    } else {
      console.error(`Failed to send event: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending event:', error.message);
  }
}

async function generateDemoData(count = 15, interval = 3000) {
  console.log(`\n🚀 Generating ${count} demo events with ${interval}ms intervals...`);
  console.log('📊 Dashboard: http://localhost:3000/dashboard\n');
  console.log('Features demonstrated:');
  console.log('  ✓ Auto dark mode (follows system preference)');
  console.log('  ✓ Live event streaming and polling fallback');
  console.log('  ✓ Relative timestamps ("2 minutes ago")');
  console.log('  ✓ Professional table design inspired by MunkiReport');
  console.log('  ✓ No emojis, clean status indicators');
  console.log('  ✓ Automatic refresh, no manual refresh button');
  console.log('  ✓ Responsive design with proper light/dark mode\n');
  
  for (let i = 0; i < count; i++) {
    const event = generateEvent();
    await sendEvent(event);
    
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log('\n✅ Demo data generation complete!');
  console.log('💡 Try switching your system dark/light mode to see auto theme switching');
  console.log('🔄 Events will auto-refresh - no manual refresh needed');
}

// Main execution
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 15;
  const interval = parseInt(process.argv[3]) || 3000;
  
  generateDemoData(count, interval).catch(console.error);
}

module.exports = { generateEvent, sendEvent, generateDemoData };
