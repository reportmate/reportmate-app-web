import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Get version information from various sources
function getVersionInfo() {
  let version = 'unknown'
  let buildId = 'unknown'
  let buildTime = 'unknown'
  
  try {
    // Try to get from environment variables
    version = process.env.NEXT_PUBLIC_VERSION || process.env.VERSION || process.env.DOCKER_TAG || 'unknown'
    buildId = process.env.NEXT_PUBLIC_BUILD_ID || process.env.BUILD_ID || process.env.GITHUB_SHA || 'unknown'
    buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || process.env.BUILD_TIME || new Date().toISOString()
    
    // Try to read from package.json if no environment variables
    if (version === 'unknown') {
      try {
        const packagePath = path.join(process.cwd(), 'package.json')
        if (fs.existsSync(packagePath)) {
          const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
          version = packageJson.version || 'unknown'
        }
      } catch (e) {
        // Ignore error, keep unknown
      }
    }
    
    // Try to read from .next/BUILD_ID if available
    if (buildId === 'unknown') {
      try {
        const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID')
        if (fs.existsSync(buildIdPath)) {
          buildId = fs.readFileSync(buildIdPath, 'utf8').trim()
        }
      } catch (e) {
        // Ignore error, keep unknown
      }
    }
    
    // Use current container tag if available
    if (version === 'unknown') {
      version = '20250807234032-8992f2c'
    }
    
  } catch (error) {
    console.warn('Error getting version info:', error)
  }
  
  return {
    version,
    buildId,
    buildTime,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  }
}

export async function GET(request: NextRequest) {
  try {
    const versionInfo = getVersionInfo()
    
    return NextResponse.json({
      success: true,
      data: versionInfo
    })
  } catch (error) {
    console.error('Version API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get version information'
    }, { status: 500 })
  }
}
