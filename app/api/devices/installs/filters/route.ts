import { NextResponse } from 'next/server'
import { getInternalApiHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cache for processed filter data
let cachedFiltersData: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Container Apps API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://reportmate-functions-api';

export async function GET(_request: Request) {
  try {
    // Check cache first
    if (cachedFiltersData && (Date.now() - cachedFiltersData.timestamp) < CACHE_TTL) {
      return NextResponse.json(cachedFiltersData.data);
    }

    // Use new FastAPI server-side filters endpoint (pre-computed counts, no items arrays)
    const headers = getInternalApiHeaders();
    
    const response = await fetch(`${API_BASE_URL}/api/v1/devices/installs/filters`, {
      cache: 'no-store',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch installs filters: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    // Cache the response
    cachedFiltersData = {
      data: responseData,
      timestamp: Date.now()
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('[INSTALLS FILTERS] Failed to build filter payload', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
