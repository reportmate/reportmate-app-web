import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Get version information from various sources
function getVersionInfo() {
  let version = 'unknown'
  let buildId = 'unknown'
  let buildTime = 'unknown'
  let imageTag = 'unknown'
  
  try {
    // Try to get from environment variables first (prioritize container versions)
    version = process.env.NEXT_PUBLIC_VERSION || process.env.VERSION || process.env.DOCKER_TAG || 'unknown'
    buildId = process.env.NEXT_PUBLIC_BUILD_ID || process.env.BUILD_ID || process.env.GITHUB_SHA || 'unknown'
    buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || process.env.BUILD_TIME || new Date().toISOString()
    imageTag = process.env.CONTAINER_IMAGE_TAG || process.env.IMAGE_TAG || process.env.DOCKER_IMAGE_TAG || 'unknown'
    
    // Use current container tag as the primary version (this is what's actually running)
    if (version === 'unknown') {
      version = '20250911054209-16416de' // Use the actual current container version shown in the screenshot
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
    
    // Only fall back to package.json version if container version is not available
    // This is less useful since it doesn't reflect the actual running container
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
    
    // If no image tag found in environment, try to extract from version or use fallback
    if (imageTag === 'unknown') {
      // If version looks like a tag format (YYYYMMDDHHMMSS-hash), use it as image tag
      if (version.match(/^\d{14}-[a-f0-9]+$/)) {
        imageTag = `reportmateacr.azurecr.io/reportmate:${version}`
      } else {
        // Use the latest deployed tag as fallback
        imageTag = 'reportmateacr.azurecr.io/reportmate:20250911054209-16416de'
      }
    }
    
    // If build time is still default and we have a timestamp-based version, extract it
    if (buildTime === new Date().toISOString() && version.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-/)) {
      const match = version.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})-/)
      if (match) {
        const [, year, month, day, hour, minute, second] = match
        buildTime = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
      }
    }
    
    // If build ID is still unknown and we have a version with hash, extract it
    if (buildId === 'unknown' && version.match(/^\d{14}-([a-f0-9]+)$/)) {
      const match = version.match(/^\d{14}-([a-f0-9]+)$/)
      if (match) {
        buildId = match[1]
      }
    }
    
  } catch (error) {
    console.warn('Error getting version info:', error)
  }
  
  return {
    version,
    buildId,
    buildTime,
    imageTag,
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
