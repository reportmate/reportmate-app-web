import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Production API base URL (single source of truth)
const PRODUCTION_API_BASE = process.env.API_BASE_URL || 'https://reportmate-api.azurewebsites.net';

export async function GET() {
    return NextResponse.json({ 
        error: 'Method not allowed',
        message: 'Use POST to submit device data'
    }, { status: 405 });
}

export async function POST(request: NextRequest) {
    const timestamp = new Date().toISOString();
    console.log(`[TRANSMISSION] ${timestamp} - Received device data transmission`);
    
    try {
        // Get the request body
        const body = await request.json();
        
        // Log for development debugging
        if (process.env.NODE_ENV === 'development') {
            console.log(`[TRANSMISSION] ${timestamp} - Request body keys:`, Object.keys(body));
            if (body.metadata) {
                console.log(`[TRANSMISSION] ${timestamp} - Device: ${body.metadata.serialNumber} (${body.metadata.deviceId})`);
            }
        }
        
        // Forward the request to production Azure Functions API
        const productionUrl = `${PRODUCTION_API_BASE}/api/transmission`;
        console.log(`[TRANSMISSION] ${timestamp} - Forwarding to production API: ${productionUrl}`);
        
        const response = await fetch(productionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-PASSPHRASE': process.env.REPORTMATE_PASSPHRASE || 's3cur3-p@ssphras3!',
                'User-Agent': 'ReportMate-Frontend-Dev/1.0'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            console.error(`[TRANSMISSION] ${timestamp} - Production API error: ${response.status} ${response.statusText}`);
            
            // Try to get error details
            let errorDetails = 'No additional details';
            try {
                const errorBody = await response.json();
                errorDetails = errorBody.message || errorBody.error || JSON.stringify(errorBody);
            } catch {
                errorDetails = await response.text() || errorDetails;
            }
            
            return NextResponse.json({
                success: false,
                error: 'Production API error',
                details: errorDetails,
                status: response.status,
                timestamp
            }, { status: response.status });
        }
        
        // Get the successful response
        const result = await response.json();
        console.log(`[TRANSMISSION] ${timestamp} - Success: Data forwarded to production API`);
        
        return NextResponse.json({
            success: true,
            message: 'Data successfully transmitted to production API',
            production_response: result,
            timestamp
        });
        
    } catch (error) {
        console.error(`[TRANSMISSION] ${timestamp} - Error:`, error);
        
        return NextResponse.json({
            success: false,
            error: 'Transmission failed',
            details: error instanceof Error ? error.message : String(error),
            timestamp
        }, { status: 500 });
    }
}
