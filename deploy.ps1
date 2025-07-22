# ReportMate Container Deployment Script (PowerShell)
# Smart deployment with build optimization and Azure Container Apps integration

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("dev", "prod")]
    [string]$Environment = "prod",
    
    [Parameter(Mandatory = $false)]
    [string]$Tag = "",
    
    [Parameter(Mandatory = $false)]
    [switch]$ForceBuild,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipDeploy,
    
    [Parameter(Mandatory = $false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory = $false)]
    [switch]$VerboseLogging,
    
    [Parameter(Mandatory = $false)]
    [switch]$Help
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$RegistryName = "reportmateacr"
$ImageName = "reportmate"
$ResourceGroup = "ReportMate"
$ContainerAppEnv = "reportmate-env"

# Colors for output (if supported)
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

# Logging functions
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $ColorInfo
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $ColorSuccess
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $ColorWarning
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

function Write-LogVerbose {
    param([string]$Message)
    if ($VerboseLogging) {
        Write-Host "[DEBUG] $Message" -ForegroundColor $ColorInfo
    }
}

# Help function
function Show-Help {
    @"
ReportMate Container Deployment Script (PowerShell)

USAGE:
    .\deploy.ps1 [OPTIONS]

OPTIONS:
    -Environment ENV        Deployment environment (dev|prod) [default: prod]
    -Tag TAG               Custom image tag [default: auto-generated]
    -ForceBuild            Force rebuild even if no changes detected
    -SkipBuild             Skip Docker build (use existing image)
    -SkipDeploy            Skip Azure deployment (build only)
    -DryRun                Show what would be done without executing
    -VerboseLogging        Enable verbose logging
    -Help                  Show this help message

EXAMPLES:
    # Deploy to production (default)
    .\deploy.ps1

    # Deploy to development environment
    .\deploy.ps1 -Environment dev

    # Force rebuild and deploy
    .\deploy.ps1 -ForceBuild

    # Build only, don't deploy
    .\deploy.ps1 -SkipDeploy

    # Dry run to see what would happen
    .\deploy.ps1 -DryRun -VerboseLogging

    # Deploy with custom tag
    .\deploy.ps1 -Tag "v1.2.3"

ENVIRONMENT VARIABLES:
    AZURE_SUBSCRIPTION_ID   Azure subscription ID
    AZURE_TENANT_ID        Azure tenant ID

"@
}

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Generate tag if not provided
if (-not $Tag) {
    $GitHash = try { 
        git rev-parse --short HEAD 2>$null 
    } catch { 
        "unknown" 
    }
    $Tag = "$(Get-Date -Format 'yyyyMMddHHmmss')-$GitHash"
}

Write-LogVerbose "Configuration:"
Write-LogVerbose "  Environment: $Environment"
Write-LogVerbose "  Tag: $Tag"
Write-LogVerbose "  Force Build: $ForceBuild"
Write-LogVerbose "  Skip Build: $SkipBuild"
Write-LogVerbose "  Skip Deploy: $SkipDeploy"
Write-LogVerbose "  Dry Run: $DryRun"

# Check prerequisites
function Test-Prerequisites {
    Write-LogInfo "Checking prerequisites..."

    # Check if we're in the right directory
    if (-not (Test-Path "$ScriptDir\package.json") -or -not (Test-Path "$ScriptDir\Dockerfile")) {
        Write-LogError "This script must be run from the apps/www directory"
        Write-LogError "Current directory: $ScriptDir"
        exit 1
    }

    # Check required tools
    $MissingTools = @()
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $MissingTools += "docker"
    }
    
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        $MissingTools += "azure-cli"
    }
    
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        $MissingTools += "pnpm"
    }

    if ($MissingTools.Count -gt 0) {
        Write-LogError "Missing required tools: $($MissingTools -join ', ')"
        exit 1
    }

    # Check Azure login
    try {
        az account show --output none 2>$null
    } catch {
        Write-LogError "Not logged into Azure. Run 'az login' first."
        exit 1
    }

    # Check Docker daemon
    try {
        docker info --format "{{.ID}}" 2>$null | Out-Null
    } catch {
        Write-LogError "Docker daemon is not running"
        exit 1
    }

    Write-LogSuccess "Prerequisites check passed"
}

# Check if rebuild is needed
function Test-ShouldRebuild {
    if ($ForceBuild) {
        Write-LogVerbose "Force build requested"
        return $true
    }

    if ($SkipBuild) {
        Write-LogVerbose "Build explicitly skipped"
        return $false
    }

    # Check if image exists locally
    $FullImageName = "$RegistryName.azurecr.io/$ImageName`:$Tag"
    try {
        docker image inspect $FullImageName 2>$null | Out-Null
    } catch {
        Write-LogVerbose "Image not found locally: $FullImageName"
        return $true
    }

    # Check for file changes since last build
    $DockerfileModified = (Get-Item "$ScriptDir\Dockerfile" -ErrorAction SilentlyContinue).LastWriteTime
    $PackageModified = (Get-Item "$ScriptDir\package.json" -ErrorAction SilentlyContinue).LastWriteTime
    $PnpmLockModified = (Get-Item "$ScriptDir\pnpm-lock.yaml" -ErrorAction SilentlyContinue).LastWriteTime
    
    # Get image creation time
    try {
        $ImageCreatedStr = docker image inspect $FullImageName --format '{{.Created}}' 2>$null
        $ImageCreated = [DateTime]::Parse($ImageCreatedStr)
        
        if ($DockerfileModified -gt $ImageCreated -or 
            $PackageModified -gt $ImageCreated -or 
            $PnpmLockModified -gt $ImageCreated) {
            Write-LogVerbose "Source files newer than image, rebuild needed"
            return $true
        }
    } catch {
        Write-LogVerbose "Could not determine image age, rebuilding"
        return $true
    }

    Write-LogVerbose "No rebuild needed, using existing image"
    return $false
}

# Build Docker image
function Invoke-BuildImage {
    if ($SkipBuild) {
        Write-LogInfo "Skipping build as requested"
        return
    }

    if (-not (Test-ShouldRebuild)) {
        Write-LogInfo "Using existing image (no changes detected)"
        return
    }

    Write-LogInfo "Building Docker image..."
    
    $FullImageName = "$RegistryName.azurecr.io/$ImageName`:$Tag"
    $LatestImageName = "$RegistryName.azurecr.io/$ImageName`:latest"
    
    $BuildArgs = @(
        "build"
        "--platform", "linux/amd64"
        "--build-arg", "DOCKER_BUILD=true"
        "--build-arg", "NODE_ENV=production"
        "--build-arg", "BUILDKIT_INLINE_CACHE=1"
        "--cache-from", $LatestImageName
        "-t", $FullImageName
        "-t", $LatestImageName
        $ScriptDir
    )

    if ($DryRun) {
        Write-LogInfo "DRY RUN: Would execute: docker $($BuildArgs -join ' ')"
        return
    }

    Write-LogVerbose "Build command: docker $($BuildArgs -join ' ')"
    
    $Process = Start-Process -FilePath "docker" -ArgumentList $BuildArgs -Wait -PassThru -NoNewWindow
    if ($Process.ExitCode -eq 0) {
        Write-LogSuccess "Image built successfully: $FullImageName"
    } else {
        Write-LogError "Failed to build Docker image"
        exit 1
    }
}

# Push image to registry
function Invoke-PushImage {
    if ($SkipBuild -and $SkipDeploy) {
        Write-LogInfo "Skipping push (both build and deploy skipped)"
        return
    }

    Write-LogInfo "Logging into Azure Container Registry..."
    
    if ($DryRun) {
        Write-LogInfo "DRY RUN: Would login to ACR and push images"
        return
    }

    # Login to ACR
    $LoginResult = az acr login --name $RegistryName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to login to Azure Container Registry"
        Write-LogError $LoginResult
        exit 1
    }

    $FullImageName = "$RegistryName.azurecr.io/$ImageName`:$Tag"
    $LatestImageName = "$RegistryName.azurecr.io/$ImageName`:latest"

    Write-LogInfo "Pushing images to registry..."
    
    # Push tagged image
    $PushResult = docker push $FullImageName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-LogSuccess "Pushed: $FullImageName"
    } else {
        Write-LogError "Failed to push tagged image"
        Write-LogError $PushResult
        exit 1
    }

    # Push latest tag
    $LatestPushResult = docker push $LatestImageName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-LogSuccess "Pushed: $LatestImageName"
    } else {
        Write-LogWarning "Failed to push latest tag (non-critical)"
        Write-LogWarning $LatestPushResult
    }
}

# Deploy to Azure Container Apps
function Invoke-DeployToAzure {
    if ($SkipDeploy) {
        Write-LogInfo "Skipping deployment as requested"
        return
    }

    Write-LogInfo "Deploying to Azure Container Apps ($Environment environment)..."

    $ContainerAppName = "reportmate-container-$Environment"
    $FullImageName = "$RegistryName.azurecr.io/$ImageName`:$Tag"

    if ($DryRun) {
        Write-LogInfo "DRY RUN: Would deploy $FullImageName to $ContainerAppName"
        return
    }

    # Check if container app exists
    $AppExists = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Container app '$ContainerAppName' not found in resource group '$ResourceGroup'"
        Write-LogError "Please ensure the infrastructure is deployed via Terraform first"
        exit 1
    }

    # Update container app with new image
    Write-LogInfo "Updating container app with new image..."
    
    $UpdateResult = az containerapp update --name $ContainerAppName --resource-group $ResourceGroup --image $FullImageName --output table 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-LogSuccess "Container app updated successfully"
        Write-Output $UpdateResult
    } else {
        Write-LogError "Failed to update container app"
        Write-LogError $UpdateResult
        exit 1
    }

    # Wait for deployment to stabilize
    Write-LogInfo "Waiting for deployment to stabilize..."
    Start-Sleep -Seconds 10

    # Get the container app URL
    $AppUrl = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" --output tsv 2>$null

    if ($AppUrl) {
        Write-LogSuccess "Deployment complete!"
        Write-LogSuccess "Application URL: https://$AppUrl"
        
        # Basic health check
        Write-LogInfo "Performing health check..."
        try {
            $Response = Invoke-WebRequest -Uri "https://$AppUrl" -UseBasicParsing -TimeoutSec 30
            $HealthStatus = $Response.StatusCode
        } catch {
            $HealthStatus = 0
        }
        
        if ($HealthStatus -eq 200) {
            Write-LogSuccess "Health check passed (Status: $HealthStatus)"
        } else {
            Write-LogWarning "Health check returned status: $HealthStatus"
            Write-LogWarning "The application may still be starting up"
        }
    } else {
        Write-LogWarning "Could not retrieve application URL"
    }
}

# Show deployment summary
function Show-Summary {
    Write-Output ""
    Write-LogInfo "Deployment Summary"
    Write-Output "===================="
    Write-Output "Environment: $Environment"
    Write-Output "Image Tag: $Tag"
    Write-Output "Registry: $RegistryName.azurecr.io"
    Write-Output "Container App: reportmate-container-$Environment"
    Write-Output "Resource Group: $ResourceGroup"
    
    if ($DryRun) {
        Write-Output "Mode: DRY RUN (no changes made)"
    } else {
        Write-Output "Mode: LIVE DEPLOYMENT"
    }
    
    Write-Output ""
}

# Main execution
try {
    # Show summary
    Show-Summary

    # Execute deployment steps
    Test-Prerequisites
    Invoke-BuildImage
    Invoke-PushImage
    Invoke-DeployToAzure

    Write-LogSuccess "All deployment steps completed successfully!"
} catch {
    Write-LogError "Deployment failed: $($_.Exception.Message)"
    exit 1
}
