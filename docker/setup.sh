#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║     Congruity Self-Hosted Setup           ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Found existing .env file${NC}"
    read -p "Do you want to reconfigure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping configuration..."
        SKIP_CONFIG=true
    fi
fi

if [ "$SKIP_CONFIG" != "true" ]; then
    echo -e "\n${BLUE}Configuration${NC}"
    echo "============="

    echo ""
    echo "Choose deployment mode:"
    echo "  1) Cloud Supabase + local Signaling/MinIO (recommended for quick self-host)"
    echo "  2) Full local Supabase stack + Signaling/MinIO"
    read -p "Select mode (1/2, default 1): " DEPLOY_MODE
    DEPLOY_MODE=${DEPLOY_MODE:-1}
    USE_LOCAL_SUPABASE=false
    if [ "$DEPLOY_MODE" = "2" ]; then
      USE_LOCAL_SUPABASE=true
    fi
    
    # Generate secrets
    echo -e "\n${YELLOW}Generating secure secrets...${NC}"
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')
    
    # Generate Supabase keys (simplified - in production use proper JWT generation)
    # These are placeholder keys - users should generate proper ones
    echo -e "${YELLOW}Note: You should generate proper Supabase API keys for production${NC}"
    echo "See: https://supabase.com/docs/guides/self-hosting#api-keys"
    
    # Site URL
    read -p "Enter your site URL (default: http://localhost:5173): " SITE_URL
    SITE_URL=${SITE_URL:-http://localhost:5173}
    
    if [ "$USE_LOCAL_SUPABASE" = "true" ]; then
      read -p "Enter your API URL (default: http://localhost:8000): " API_URL
      API_URL=${API_URL:-http://localhost:8000}
    else
      read -p "Enter your cloud Supabase URL (e.g. https://xyz.supabase.co): " API_URL
      if [ -z "$API_URL" ]; then
        echo -e "${RED}Cloud Supabase URL is required in mode 1${NC}"
        exit 1
      fi
    fi

    read -p "Public hostname/IP for self-hosted signaling+MinIO (default: localhost): " SELFHOSTED_PUBLIC_HOST
    SELFHOSTED_PUBLIC_HOST=${SELFHOSTED_PUBLIC_HOST:-localhost}

    read -p "MinIO bucket name (default: congruity-media): " MINIO_BUCKET
    MINIO_BUCKET=${MINIO_BUCKET:-congruity-media}
    MINIO_ROOT_USER=minioadmin
    MINIO_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
    
    # Dashboard credentials
    read -p "Enter dashboard username (default: admin): " DASHBOARD_USER
    DASHBOARD_USER=${DASHBOARD_USER:-admin}
    
    read -s -p "Enter dashboard password: " DASHBOARD_PASS
    echo
    if [ -z "$DASHBOARD_PASS" ]; then
        DASHBOARD_PASS=$(openssl rand -base64 16)
        echo -e "${YELLOW}Generated dashboard password: ${DASHBOARD_PASS}${NC}"
    fi
    
    # Create .env file
    cat > .env << EOF
# Congruity Self-Hosted Configuration
# Generated on $(date)

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT Secret (used by all services)
JWT_SECRET=${JWT_SECRET}

# Supabase API Keys
# TODO: Generate proper keys at https://supabase.com/docs/guides/self-hosting#api-keys
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# URLs
SITE_URL=${SITE_URL}
API_EXTERNAL_URL=${API_URL}

# Dashboard
DASHBOARD_USERNAME=${DASHBOARD_USER}
DASHBOARD_PASSWORD=${DASHBOARD_PASS}

# Realtime
SECRET_KEY_BASE=${SECRET_KEY_BASE}

# Deployment mode
USE_LOCAL_SUPABASE=${USE_LOCAL_SUPABASE}

# MinIO (self-hosted media)
MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
MINIO_BUCKET=${MINIO_BUCKET}
MINIO_REGION=us-east-1
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001

# Self-hosted public endpoints
SELFHOSTED_PUBLIC_HOST=${SELFHOSTED_PUBLIC_HOST}

# Ports
POSTGRES_PORT=5432
API_PORT=8000
API_SSL_PORT=8443
SIGNALING_PORT=3001

# Auth
DISABLE_SIGNUP=false
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
JWT_EXPIRY=3600
EOF

    echo -e "\n${GREEN}✓ Configuration saved to .env${NC}"
    echo -e "${YELLOW}Generated MinIO root password:${NC} ${MINIO_ROOT_PASSWORD}"
fi

# Load configuration from .env for this script run
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Create required directories
echo -e "\n${YELLOW}Creating required directories...${NC}"
mkdir -p volumes/db/init
mkdir -p volumes/api

if [ "${USE_LOCAL_SUPABASE}" = "true" ]; then
  # Create Kong configuration
  echo -e "${YELLOW}Creating API gateway configuration...${NC}"
  cat > volumes/api/kong.yml << 'EOF'
_format_version: "2.1"
_transform: true

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors

  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors

  - name: auth-v1
    url: http://auth:9999
    routes:
      - name: auth-v1
        strip_path: true
        paths:
          - /auth/v1
    plugins:
      - name: cors

  - name: rest-v1
    url: http://rest:3000
    routes:
      - name: rest-v1
        strip_path: true
        paths:
          - /rest/v1
    plugins:
      - name: cors

  - name: realtime-v1
    url: http://realtime:4000/socket
    routes:
      - name: realtime-v1
        strip_path: true
        paths:
          - /realtime/v1
    plugins:
      - name: cors

  - name: storage-v1
    url: http://storage:5000
    routes:
      - name: storage-v1
        strip_path: true
        paths:
          - /storage/v1
    plugins:
      - name: cors
EOF
fi

echo -e "${GREEN}✓ Directories and configurations created${NC}"

# Pull images
echo -e "\n${YELLOW}Pulling Docker images (this may take a while)...${NC}"
if [ "${USE_LOCAL_SUPABASE}" = "true" ]; then
  docker compose pull
else
  docker compose pull signaling minio minio-init
fi

# Start services
echo -e "\n${YELLOW}Starting services...${NC}"
if [ "${USE_LOCAL_SUPABASE}" = "true" ]; then
  docker compose up -d
else
  docker compose up -d signaling minio
  docker compose run --rm minio-init || true
fi

# Wait for services to be healthy
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "\n${BLUE}Service Status${NC}"
echo "=============="
docker compose ps

SIGNALING_PUBLIC_URL="wss://${SELFHOSTED_PUBLIC_HOST}:${SIGNALING_PORT:-3001}"
MINIO_PUBLIC_BASE_URL="http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_PORT:-9000}/${MINIO_BUCKET}"
cat > selfhosted-backend-registration.sql << EOF
-- Run this in your Supabase SQL editor (cloud or local) after creating a server.
-- Replace SERVER_UUID_HERE with your actual server id.
INSERT INTO public.server_backends (
  server_id,
  backend_mode,
  signaling_url,
  storage_provider,
  storage_public_base_url,
  storage_bucket,
  storage_region,
  created_by
) VALUES (
  'SERVER_UUID_HERE',
  'self_hosted',
  '${SIGNALING_PUBLIC_URL}',
  'minio',
  '${MINIO_PUBLIC_BASE_URL}',
  '${MINIO_BUCKET}',
  'us-east-1',
  auth.uid()
)
ON CONFLICT (server_id) DO UPDATE
SET
  backend_mode = EXCLUDED.backend_mode,
  signaling_url = EXCLUDED.signaling_url,
  storage_provider = EXCLUDED.storage_provider,
  storage_public_base_url = EXCLUDED.storage_public_base_url,
  storage_bucket = EXCLUDED.storage_bucket,
  storage_region = EXCLUDED.storage_region;
EOF

echo -e "\n${GREEN}╔═══════════════════════════════════════════╗"
echo "║     Setup Complete!                       ║"
echo "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "Your Congruity server is now running!"
echo ""
if [ "${USE_LOCAL_SUPABASE}" = "true" ]; then
  echo -e "  ${BLUE}API:${NC}        ${API_URL:-http://localhost:8000}"
else
  echo -e "  ${BLUE}Supabase:${NC}   ${API_URL}"
fi
echo -e "  ${BLUE}Signaling:${NC}  ${SIGNALING_PUBLIC_URL}"
echo -e "  ${BLUE}MinIO:${NC}      http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_PORT:-9000}"
echo -e "  ${BLUE}MinIO Console:${NC} http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_CONSOLE_PORT:-9001}"
echo -e "  ${BLUE}MinIO Bucket:${NC} ${MINIO_BUCKET}"
echo ""
echo -e "${YELLOW}Server backend mapping SQL:${NC} docker/selfhosted-backend-registration.sql"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure your Congruity client:"
echo "   VITE_SUPABASE_URL=${API_URL}"
echo "   VITE_SUPABASE_ANON_KEY=<anon key for the selected Supabase project>"
echo "2. Run selfhosted-backend-registration.sql in Supabase for each self-hosted server."
echo "3. Restart client and join/select the server."
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker compose logs -f    # View logs"
echo "  docker compose down       # Stop services"
echo "  docker compose restart    # Restart services"
