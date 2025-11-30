import { NextResponse } from 'next/server'
import { getDevicesWithInstalls } from '../shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/devices/installs/data
 * 
 * Returns all devices with ONLY installs + inventory modules
 * Uses shared cache for performance
 */
export async function GET() {
  try {
    const result = await getDevicesWithInstalls();

    return NextResponse.json({
      success: true,
      total: result.total,
      withInstalls: result.withInstalls,
      devices: result.devices
    });

  } catch (error) {
    console.error('[INSTALLS DATA] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
