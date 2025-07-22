#!/bin/bash

# ReportMate Container Deployment Script
# Smart deployment with build optimization and Azure Container Apps integration

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REGISTRY_NAME="reportmateacr"
IMAGE_NAME="reportmate"
RESOURCE_GROUP="ReportMate"
CONTAINER_APP_ENV="reportmate-env"

# Default values
ENVIRONMENT="prod"
FORCE_BUILD=false
SKIP_BUILD=false
SKIP_DEPLOY=false
DRY_RUN=false
VERBOSE=false
TAG=""
BUILD_ARGS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Help function
show_help() {
    cat << EOF
ReportMate Container Deployment Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV    Deployment environment (dev|prod) [default: prod]
    -t, --tag TAG           Custom image tag [default: auto-generated]
    -f, --force-build       Force rebuild even if no changes detected
    -s, --skip-build        Skip Docker build (use existing image)
    -d, --skip-deploy       Skip Azure deployment (build only)
    -n, --dry-run          Show what would be done without executing
    -v, --verbose          Enable verbose logging
    -h, --help             Show this help message

EXAMPLES:
    # Deploy to production (default)
    $0

    # Deploy to development environment
    $0 --environment dev

    # Force rebuild and deploy
    $0 --force-build

    # Build only, don't deploy
    $0 --skip-deploy

    # Dry run to see what would happen
    $0 --dry-run --verbose

    # Deploy with custom tag
    $0 --tag "v1.2.3"

ENVIRONMENT VARIABLES:
    AZURE_SUBSCRIPTION_ID   Azure subscription ID
    AZURE_TENANT_ID        Azure tenant ID
    REGISTRY_NAME          Container registry name [default: reportmateacr]
    RESOURCE_GROUP         Azure resource group [default: ReportMate]

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -t|--tag)
                TAG="$2"
                shift 2
                ;;
            -f|--force-build)
                FORCE_BUILD=true
                shift
                ;;
            -s|--skip-build)
                SKIP_BUILD=true
                shift
                ;;
            -d|--skip-deploy)
                SKIP_DEPLOY=true
                shift
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate environment
    if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
        log_error "Environment must be 'dev' or 'prod'"
        exit 1
    fi

    # Generate tag if not provided
    if [[ -z "$TAG" ]]; then
        TAG="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    fi

    log_verbose "Configuration:"
    log_verbose "  Environment: $ENVIRONMENT"
    log_verbose "  Tag: $TAG"
    log_verbose "  Force Build: $FORCE_BUILD"
    log_verbose "  Skip Build: $SKIP_BUILD"
    log_verbose "  Skip Deploy: $SKIP_DEPLOY"
    log_verbose "  Dry Run: $DRY_RUN"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if we're in the right directory
    if [[ ! -f "$SCRIPT_DIR/package.json" || ! -f "$SCRIPT_DIR/Dockerfile" ]]; then
        log_error "This script must be run from the apps/www directory"
        log_error "Current directory: $SCRIPT_DIR"
        exit 1
    fi

    # Check required tools
    local missing_tools=()
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v az &> /dev/null; then
        missing_tools+=("azure-cli")
    fi
    
    if ! command -v pnpm &> /dev/null; then
        missing_tools+=("pnpm")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    # Check Azure login
    if ! az account show &>/dev/null; then
        log_error "Not logged into Azure. Run 'az login' first."
        exit 1
    fi

    # Check Docker daemon
    if ! docker info &>/dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Check if rebuild is needed
should_rebuild() {
    if [[ "$FORCE_BUILD" == "true" ]]; then
        log_verbose "Force build requested"
        return 0
    fi

    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_verbose "Build explicitly skipped"
        return 1
    fi

    # Check if image exists locally
    local full_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$TAG"
    if ! docker image inspect "$full_image_name" &>/dev/null; then
        log_verbose "Image not found locally: $full_image_name"
        return 0
    fi

    # Check for file changes since last build
    local dockerfile_modified=$(stat -c %Y "$SCRIPT_DIR/Dockerfile" 2>/dev/null || echo 0)
    local package_modified=$(stat -c %Y "$SCRIPT_DIR/package.json" 2>/dev/null || echo 0)
    local pnpm_lock_modified=$(stat -c %Y "$SCRIPT_DIR/pnpm-lock.yaml" 2>/dev/null || echo 0)
    
    # Get image creation time
    local image_created=$(docker image inspect "$full_image_name" --format '{{.Created}}' 2>/dev/null || echo "")
    if [[ -n "$image_created" ]]; then
        local image_timestamp=$(date -d "$image_created" +%s 2>/dev/null || echo 0)
        
        if [[ $dockerfile_modified -gt $image_timestamp ]] || 
           [[ $package_modified -gt $image_timestamp ]] || 
           [[ $pnpm_lock_modified -gt $image_timestamp ]]; then
            log_verbose "Source files newer than image, rebuild needed"
            return 0
        fi
    fi

    log_verbose "No rebuild needed, using existing image"
    return 1
}

# Build Docker image
build_image() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "Skipping build as requested"
        return 0
    fi

    if ! should_rebuild; then
        log_info "Using existing image (no changes detected)"
        return 0
    fi

    log_info "Building Docker image..."
    
    local full_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$TAG"
    local latest_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:latest"
    
    # Build arguments
    local build_cmd=(
        docker build
        --platform linux/amd64
        --build-arg DOCKER_BUILD=true
        --build-arg NODE_ENV=production
        --build-arg BUILDKIT_INLINE_CACHE=1
        --cache-from "$latest_image_name"
        -t "$full_image_name"
        -t "$latest_image_name"
        "$SCRIPT_DIR"
    )

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would execute: ${build_cmd[*]}"
        return 0
    fi

    log_verbose "Build command: ${build_cmd[*]}"
    
    if "${build_cmd[@]}"; then
        log_success "Image built successfully: $full_image_name"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Push image to registry
push_image() {
    if [[ "$SKIP_BUILD" == "true" && "$SKIP_DEPLOY" == "true" ]]; then
        log_info "Skipping push (both build and deploy skipped)"
        return 0
    fi

    log_info "Logging into Azure Container Registry..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would login to ACR and push images"
        return 0
    fi

    # Login to ACR
    if ! az acr login --name "$REGISTRY_NAME"; then
        log_error "Failed to login to Azure Container Registry"
        exit 1
    fi

    local full_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$TAG"
    local latest_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:latest"

    log_info "Pushing images to registry..."
    
    # Push tagged image
    if docker push "$full_image_name"; then
        log_success "Pushed: $full_image_name"
    else
        log_error "Failed to push tagged image"
        exit 1
    fi

    # Push latest tag
    if docker push "$latest_image_name"; then
        log_success "Pushed: $latest_image_name"
    else
        log_warning "Failed to push latest tag (non-critical)"
    fi
}

# Deploy to Azure Container Apps
deploy_to_azure() {
    if [[ "$SKIP_DEPLOY" == "true" ]]; then
        log_info "Skipping deployment as requested"
        return 0
    fi

    log_info "Deploying to Azure Container Apps ($ENVIRONMENT environment)..."

    local container_app_name="reportmate-container-$ENVIRONMENT"
    local full_image_name="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$TAG"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy $full_image_name to $container_app_name"
        return 0
    fi

    # Check if container app exists
    if ! az containerapp show \
        --name "$container_app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --output none 2>/dev/null; then
        log_error "Container app '$container_app_name' not found in resource group '$RESOURCE_GROUP'"
        log_error "Please ensure the infrastructure is deployed via Terraform first"
        exit 1
    fi

    # Update container app with new image
    log_info "Updating container app with new image..."
    
    if az containerapp update \
        --name "$container_app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --image "$full_image_name" \
        --output table; then
        log_success "Container app updated successfully"
    else
        log_error "Failed to update container app"
        exit 1
    fi

    # Wait for deployment to stabilize
    log_info "Waiting for deployment to stabilize..."
    sleep 10

    # Get the container app URL
    local app_url=$(az containerapp show \
        --name "$container_app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv 2>/dev/null)

    if [[ -n "$app_url" ]]; then
        log_success "Deployment complete!"
        log_success "Application URL: https://$app_url"
        
        # Basic health check
        log_info "Performing health check..."
        local health_status=$(curl -s -o /dev/null -w "%{http_code}" "https://$app_url" || echo "000")
        
        if [[ "$health_status" == "200" ]]; then
            log_success "Health check passed (Status: $health_status)"
        else
            log_warning "Health check returned status: $health_status"
            log_warning "The application may still be starting up"
        fi
    else
        log_warning "Could not retrieve application URL"
    fi
}

# Show deployment summary
show_summary() {
    echo ""
    log_info "Deployment Summary"
    echo "===================="
    echo "Environment: $ENVIRONMENT"
    echo "Image Tag: $TAG"
    echo "Registry: $REGISTRY_NAME.azurecr.io"
    echo "Container App: reportmate-container-$ENVIRONMENT"
    echo "Resource Group: $RESOURCE_GROUP"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "Mode: DRY RUN (no changes made)"
    else
        echo "Mode: LIVE DEPLOYMENT"
    fi
    
    echo ""
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
    fi
    exit $exit_code
}

# Main execution
main() {
    # Set up error handling
    trap cleanup EXIT

    # Parse arguments
    parse_args "$@"

    # Show summary
    show_summary

    # Execute deployment steps
    check_prerequisites
    build_image
    push_image
    deploy_to_azure

    log_success "All deployment steps completed successfully!"
}

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
