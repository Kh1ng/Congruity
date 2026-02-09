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
    
    read -p "Enter your API URL (default: http://localhost:8000): " API_URL
    API_URL=${API_URL:-http://localhost:8000}
    
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
fi

# Create required directories
echo -e "\n${YELLOW}Creating required directories...${NC}"
mkdir -p volumes/db/init
mkdir -p volumes/api

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

echo -e "${GREEN}✓ Directories and configurations created${NC}"

# Pull images
echo -e "\n${YELLOW}Pulling Docker images (this may take a while)...${NC}"
docker compose pull

# Start services
echo -e "\n${YELLOW}Starting services...${NC}"
docker compose up -d

# Wait for services to be healthy
echo -e "\n${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service status
echo -e "\n${BLUE}Service Status${NC}"
echo "=============="
docker compose ps

echo -e "\n${GREEN}╔═══════════════════════════════════════════╗"
echo "║     Setup Complete!                       ║"
echo "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "Your Congruity server is now running!"
echo ""
echo -e "  ${BLUE}API:${NC}        ${API_URL:-http://localhost:8000}"
echo -e "  ${BLUE}Signaling:${NC}  ws://localhost:${SIGNALING_PORT:-3001}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure your Congruity client to connect to this server"
echo "2. Set VITE_SUPABASE_URL=${API_URL:-http://localhost:8000}"
echo "3. Set VITE_SUPABASE_ANON_KEY to the ANON_KEY from .env"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  docker compose logs -f    # View logs"
echo "  docker compose down       # Stop services"
echo "  docker compose restart    # Restart services"
