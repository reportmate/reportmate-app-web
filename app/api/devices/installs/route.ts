import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');
    
    const timestamp = new Date().toISOString();
    console.log(`[FAST INSTALLS API] ${timestamp} - Using optimized Azure Functions installs endpoint${deviceId ? ` for device ${deviceId}` : ''}`);

    // Use the new optimized Azure Functions installs endpoint
    const apiResponse = await fetch('https://reportmate-api.azurewebsites.net/api/devices/installs', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ReportMate-Frontend/1.0'
      }
    });
    
    if (!apiResponse.ok) {
      console.error('[FAST INSTALLS API] API fetch failed:', apiResponse.status);
      return NextResponse.json({
        error: 'Failed to fetch installs data',
        status: apiResponse.status
      }, { status: 500 });
    }
    
    const installsData = await apiResponse.json();
    console.log('[FAST INSTALLS API] Raw API response type:', typeof installsData);
    console.log('[FAST INSTALLS API] Installs count:', Array.isArray(installsData) ? installsData.length : 'not array');
    
    const installsArray = Array.isArray(installsData) ? installsData : [];
    
    // Filter by device if requested
    const filteredInstalls = deviceId 
      ? installsArray.filter(install => install.deviceId === deviceId || install.serialNumber === deviceId)
      : installsArray;
    
    console.log('[FAST INSTALLS API] Filtered installs count:', filteredInstalls.length);
    
    if (filteredInstalls.length === 0) {
      if (deviceId) {
        console.log('[FAST INSTALLS API] Device not found:', deviceId);
        return NextResponse.json({ error: 'Device not found', deviceId }, { status: 404 });
      }
      console.log('[FAST INSTALLS API] No install data found');
      return NextResponse.json([]);
    }
    
    // Data is already processed by Azure Functions, just return it
    if (deviceId && filteredInstalls.length > 0) {
      return NextResponse.json(filteredInstalls[0]);
    }
    
    return NextResponse.json(filteredInstalls);
    
  } catch (error) {
    console.error('[FAST INSTALLS API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch installs data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
