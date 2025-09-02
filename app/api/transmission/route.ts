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
        // Forward the entire request without consuming the body
        const productionUrl = `${PRODUCTION_API_BASE}/api/device`;
        console.log(`[TRANSMISSION] ${timestamp} - Forwarding to production API: ${productionUrl}`);
        
        // Create headers for forwarding (using Azure Managed Identity)
        const forwardHeaders = new Headers();
        forwardHeaders.set('Content-Type', request.headers.get('content-type') || 'application/json');
        forwardHeaders.set('User-Agent', 'ReportMate-Frontend/1.0');
        
        // Forward request using the raw body
        const response = await fetch(productionUrl, {
            method: 'POST',
            headers: forwardHeaders,
            body: request.body
        });
        
        if (!response.ok) {
            console.error(`[TRANSMISSION] ${timestamp} - Production API error: ${response.status} ${response.statusText}`);
            
            let errorDetails = 'No additional details';
            try {
                errorDetails = await response.text();
            } catch {
                errorDetails = `HTTP ${response.status} ${response.statusText}`;
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
