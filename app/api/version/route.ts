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
    // CONTAINER_IMAGE_TAG is set by Terraform and contains the actual deployed image tag
    version = process.env.CONTAINER_IMAGE_TAG || process.env.NEXT_PUBLIC_VERSION || process.env.VERSION || process.env.DOCKER_TAG || 'unknown'
    buildId = process.env.BUILD_ID || process.env.NEXT_PUBLIC_BUILD_ID || process.env.GITHUB_SHA || 'unknown'
    buildTime = process.env.BUILD_TIME || process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()
    imageTag = process.env.CONTAINER_IMAGE_TAG || process.env.IMAGE_TAG || process.env.DOCKER_IMAGE_TAG || 'unknown'
    
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
    
    // If no image tag found in environment, construct from version
    if (imageTag === 'unknown' && version !== 'unknown') {
      // If version looks like a tag format (YYYYMMDDHHMMSS-hash), use it as image tag
      if (version.match(/^\d{14}-[a-f0-9]+$/)) {
        imageTag = `reportmateacr.azurecr.io/reportmate:${version}`
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
