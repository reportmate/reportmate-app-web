# Container Deployment Scripts

This directory contains smart deployment scripts for the ReportMate container application.

## Available Scripts

### 🐧 Linux/macOS: `deploy.sh`
Bash script for Unix-based systems.

### 🪟 Windows: `deploy.ps1` 
PowerShell script for Windows systems.

## Quick Start

### Basic Deployment (Production)
```bash
# Linux/macOS
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

### Development Environment
```bash
# Linux/macOS
./deploy.sh --environment dev

# Windows PowerShell
.\deploy.ps1 -Environment dev
```

## Features

✅ **Smart Build Detection** - Only rebuilds when source files change  
✅ **Force Build Option** - Override smart detection  
✅ **Skip Build/Deploy** - Build-only or deploy-only modes  
✅ **Dry Run Mode** - See what would happen without making changes  
✅ **Health Checks** - Verify deployment success  
✅ **Verbose Logging** - Detailed debug information  
✅ **Auto-tagging** - Timestamp + git hash tags  
✅ **Azure Integration** - Direct Container Apps deployment  

## Prerequisites

Before using these scripts, ensure you have:

1. **Docker** installed and running
2. **Azure CLI** installed and logged in (`az login`)
3. **pnpm** package manager installed
4. **Infrastructure deployed** via Terraform (the Container Apps must exist)

## Options

| Option | Bash | PowerShell | Description |
|--------|------|------------|-------------|
| Environment | `--environment dev\|prod` | `-Environment dev\|prod` | Target environment |
| Custom Tag | `--tag "v1.2.3"` | `-Tag "v1.2.3"` | Custom image tag |
| Force Build | `--force-build` | `-ForceBuild` | Force rebuild |
| Skip Build | `--skip-build` | `-SkipBuild` | Use existing image |
| Skip Deploy | `--skip-deploy` | `-SkipDeploy` | Build only |
| Dry Run | `--dry-run` | `-DryRun` | Show actions without executing |
| Verbose | `--verbose` | `-Verbose` | Enable debug logging |
| Help | `--help` | `-Help` | Show help message |

## Examples

### Force Rebuild Everything
```bash
# Linux/macOS
./deploy.sh --force-build --verbose

# Windows PowerShell
.\deploy.ps1 -ForceBuild -Verbose
```

### Build Only (No Deployment)
```bash
# Linux/macOS
./deploy.sh --skip-deploy

# Windows PowerShell
.\deploy.ps1 -SkipDeploy
```

### Deploy Existing Image
```bash
# Linux/macOS
./deploy.sh --skip-build --tag "20250120151530-abc1234"

# Windows PowerShell
.\deploy.ps1 -SkipBuild -Tag "20250120151530-abc1234"
```

### Dry Run (See What Would Happen)
```bash
# Linux/macOS
./deploy.sh --dry-run --verbose

# Windows PowerShell
.\deploy.ps1 -DryRun -Verbose
```

## Architecture Integration

These scripts integrate with your ReportMate infrastructure:

- **Container Registry**: `reportmateacr.azurecr.io`
- **Resource Group**: `ReportMate`
- **Container Apps**: 
  - `reportmate-container-dev` (development)
  - `reportmate-container-prod` (production)

## Smart Build Logic

The scripts automatically determine if a rebuild is needed by checking:

1. **Force build flag** - Always rebuild if `--force-build` is used
2. **Image existence** - Rebuild if image doesn't exist locally
3. **File modifications** - Rebuild if source files are newer than the image:
   - `Dockerfile`
   - `package.json`
   - `pnpm-lock.yaml`

## Error Handling

The scripts include comprehensive error handling:

- **Prerequisites validation** - Checks for required tools and Azure login
- **Infrastructure validation** - Ensures Container Apps exist before deployment
- **Build failure detection** - Stops on Docker build errors
- **Deployment verification** - Confirms successful Azure deployment
- **Health checks** - Tests application responsiveness post-deployment

## Environment Variables

Optional environment variables for customization:

- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID
- `AZURE_TENANT_ID` - Azure tenant ID

## Troubleshooting

### Common Issues

1. **"Container app not found"**
   - Ensure Terraform infrastructure is deployed
   - Check resource group and app names match

2. **"Docker daemon not running"**
   - Start Docker Desktop or Docker service

3. **"Not logged into Azure"**
   - Run `az login` and select the correct subscription

4. **"Permission denied" (Linux/macOS)**
   - Make script executable: `chmod +x deploy.sh`

### Getting Help

Run the scripts with the help flag for detailed usage information:

```bash
# Linux/macOS
./deploy.sh --help

# Windows PowerShell
.\deploy.ps1 -Help
```

## Integration with CI/CD

These scripts can be integrated into your CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy Container
  run: |
    cd apps/www
    ./deploy.sh --environment prod --tag ${{ github.sha }}
```

```yaml
# Azure DevOps example
- script: |
    cd apps/www
    .\deploy.ps1 -Environment prod -Tag $(Build.SourceVersion)
  displayName: 'Deploy Container'
```
