#!/bin/bash
set -e

CONFIGURE_ONLY=false
NON_INTERACTIVE=false
SKIP_PREREQ_CHECKS=false
SKIP_CLOUDFLARE_PROMPT=${SKIP_CLOUDFLARE_PROMPT:-false}

base64url_encode() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

generate_jwt_hs256() {
  local role="$1"
  local expires_at="$2"
  local header payload encoded_header encoded_payload signature
  header='{"alg":"HS256","typ":"JWT"}'
  payload=$(printf '{"iss":"supabase-self-hosted","role":"%s","exp":%s}' "${role}" "${expires_at}")
  encoded_header=$(printf '%s' "${header}" | base64url_encode)
  encoded_payload=$(printf '%s' "${payload}" | base64url_encode)
  signature=$(
    printf '%s' "${encoded_header}.${encoded_payload}" |
      openssl dgst -sha256 -hmac "${JWT_SECRET}" -binary |
      base64url_encode
  )
  printf '%s.%s.%s' "${encoded_header}" "${encoded_payload}" "${signature}"
}

for arg in "$@"; do
  case "$arg" in
    --configure-only|--setup-only)
      CONFIGURE_ONLY=true
      ;;
    --non-interactive)
      NON_INTERACTIVE=true
      ;;
    --skip-prereq-checks)
      SKIP_PREREQ_CHECKS=true
      ;;
    --skip-cloudflare)
      SKIP_CLOUDFLARE_PROMPT=true
      ;;
  esac
done

if [ "${NON_INTERACTIVE}" = "true" ]; then
  SKIP_CLOUDFLARE_PROMPT=true
fi

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

if [ "${SKIP_PREREQ_CHECKS}" = "true" ]; then
    echo -e "${YELLOW}Skipping dependency checks (--skip-prereq-checks)${NC}"
else
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
fi

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Found existing .env file${NC}"
    if [ "${NON_INTERACTIVE}" = "true" ]; then
        SETUP_RECONFIGURE_EXISTING=${SETUP_RECONFIGURE_EXISTING:-true}
        if [[ ! ${SETUP_RECONFIGURE_EXISTING} =~ ^([Tt][Rr][Uu][Ee]|1|[Yy]([Ee][Ss])?)$ ]]; then
            echo "Skipping configuration (non-interactive mode)..."
            SKIP_CONFIG=true
        fi
    else
        read -p "Do you want to reconfigure? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Skipping configuration..."
            SKIP_CONFIG=true
        fi
    fi
fi

if [ "$SKIP_CONFIG" != "true" ]; then
    echo -e "\n${BLUE}Configuration${NC}"
    echo "============="

    echo ""
    echo "Choose deployment mode:"
    echo "  1) Cloud Supabase + local Signaling/MinIO (recommended for quick self-host)"
    echo "  2) Full local Supabase stack + Signaling/MinIO"
    if [ "${NON_INTERACTIVE}" = "true" ]; then
      DEPLOY_MODE=${DEPLOY_MODE:-1}
      echo "Select mode (1/2, default 1): ${DEPLOY_MODE} (non-interactive)"
    else
      read -p "Select mode (1/2, default 1): " DEPLOY_MODE
    fi
    DEPLOY_MODE=${DEPLOY_MODE:-1}
    USE_LOCAL_SUPABASE=false
    if [ "$DEPLOY_MODE" = "2" ]; then
      USE_LOCAL_SUPABASE=true
    fi
    
    # Generate secrets
    echo -e "\n${YELLOW}Generating secure secrets...${NC}"
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -base64 32)}
    JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
    SECRET_KEY_BASE=${SECRET_KEY_BASE:-$(openssl rand -base64 64 | tr -d '\n')}
    
    # Site URL
    if [ "${NON_INTERACTIVE}" = "true" ]; then
      SITE_URL=${SITE_URL:-http://localhost:5173}
      echo "Enter your site URL (default: http://localhost:5173): ${SITE_URL} (non-interactive)"
    else
      read -p "Enter your site URL (default: http://localhost:5173): " SITE_URL
    fi
    SITE_URL=${SITE_URL:-http://localhost:5173}
    
    if [ "$USE_LOCAL_SUPABASE" = "true" ]; then
      if [ "${NON_INTERACTIVE}" = "true" ]; then
        API_URL=${API_URL:-http://localhost:8000}
        echo "Enter your API URL (default: http://localhost:8000): ${API_URL} (non-interactive)"
      else
        read -p "Enter your API URL (default: http://localhost:8000): " API_URL
      fi
      API_URL=${API_URL:-http://localhost:8000}
    else
      if [ "${NON_INTERACTIVE}" = "true" ]; then
        API_URL=${API_URL:-}
        echo "Enter your cloud Supabase URL (e.g. https://xyz.supabase.co): ${API_URL} (non-interactive)"
      else
        read -p "Enter your cloud Supabase URL (e.g. https://xyz.supabase.co): " API_URL
      fi
      if [ -z "$API_URL" ]; then
        echo -e "${RED}Cloud Supabase URL is required in mode 1${NC}"
        exit 1
      fi

      if [ "${NON_INTERACTIVE}" = "true" ]; then
        ANON_KEY=${ANON_KEY:-}
        SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:-}
      else
        read -p "Cloud Supabase anon key (optional for this script): " ANON_KEY
        read -p "Cloud Supabase service role key (optional for this script): " SERVICE_ROLE_KEY
      fi
    fi

    if [ "$USE_LOCAL_SUPABASE" = "true" ]; then
      key_expiry=$(( $(date +%s) + (10 * 365 * 24 * 60 * 60) ))
      ANON_KEY=${ANON_KEY:-$(generate_jwt_hs256 "anon" "${key_expiry}")}
      SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:-$(generate_jwt_hs256 "service_role" "${key_expiry}")}
    else
      ANON_KEY=${ANON_KEY:-SET_FROM_CLOUD_SUPABASE}
      SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY:-SET_FROM_CLOUD_SUPABASE}
    fi

    if [ "${NON_INTERACTIVE}" = "true" ]; then
      SELFHOSTED_PUBLIC_HOST=${SELFHOSTED_PUBLIC_HOST:-localhost}
      echo "Public hostname/IP for self-hosted signaling+MinIO (default: localhost): ${SELFHOSTED_PUBLIC_HOST} (non-interactive)"
    else
      read -p "Public hostname/IP for self-hosted signaling+MinIO (default: localhost): " SELFHOSTED_PUBLIC_HOST
    fi
    SELFHOSTED_PUBLIC_HOST=${SELFHOSTED_PUBLIC_HOST:-localhost}

    if [ "${NON_INTERACTIVE}" = "true" ]; then
      MINIO_BUCKET=${MINIO_BUCKET:-congruity-media}
      echo "MinIO bucket name (default: congruity-media): ${MINIO_BUCKET} (non-interactive)"
    else
      read -p "MinIO bucket name (default: congruity-media): " MINIO_BUCKET
    fi
    MINIO_BUCKET=${MINIO_BUCKET:-congruity-media}
    MINIO_ROOT_USER=minioadmin
    MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n')}
    LIVEKIT_API_KEY=${LIVEKIT_API_KEY:-devkey}
    LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET:-$(openssl rand -hex 24)}
    TURN_SECRET=${TURN_SECRET:-$(openssl rand -hex 24)}
    TURN_HOST=${TURN_HOST:-${SELFHOSTED_PUBLIC_HOST}}
    FEDERATION_SHARED_SECRET=${FEDERATION_SHARED_SECRET:-$(openssl rand -hex 32)}
    SERVER_DOMAIN=${SERVER_DOMAIN:-${SELFHOSTED_PUBLIC_HOST}}

    if [ "${SELFHOSTED_PUBLIC_HOST}" = "localhost" ] || [ "${SELFHOSTED_PUBLIC_HOST}" = "127.0.0.1" ]; then
      LIVEKIT_EXTERNAL_URL=${LIVEKIT_EXTERNAL_URL:-ws://localhost:7880}
    else
      LIVEKIT_EXTERNAL_URL=${LIVEKIT_EXTERNAL_URL:-wss://${SELFHOSTED_PUBLIC_HOST}:7880}
    fi
    LIVEKIT_URL=${LIVEKIT_URL:-ws://livekit:7880}
    
    # Dashboard credentials
    if [ "${NON_INTERACTIVE}" = "true" ]; then
      DASHBOARD_USER=${DASHBOARD_USER:-admin}
      echo "Enter dashboard username (default: admin): ${DASHBOARD_USER} (non-interactive)"
    else
      read -p "Enter dashboard username (default: admin): " DASHBOARD_USER
    fi
    DASHBOARD_USER=${DASHBOARD_USER:-admin}
    
    if [ "${NON_INTERACTIVE}" = "true" ]; then
        DASHBOARD_PASS=${DASHBOARD_PASS:-}
        echo "Enter dashboard password: [hidden] (non-interactive)"
    else
        read -s -p "Enter dashboard password: " DASHBOARD_PASS
        echo
    fi
    if [ -z "$DASHBOARD_PASS" ]; then
        DASHBOARD_PASS=${DASHBOARD_PASS:-$(openssl rand -base64 16)}
        echo -e "${YELLOW}Generated dashboard password: ${DASHBOARD_PASS}${NC}"
    fi
    
    # Create .env file
    cat > .env << EOF
# Congruity Self-Hosted Configuration
# Generated on ${SETUP_GENERATED_AT:-$(date)}

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT Secret (used by all services)
JWT_SECRET=${JWT_SECRET}

# Supabase API Keys
# Local mode: generated from JWT_SECRET.
# Cloud mode: set to cloud project values or left as placeholder (not used by local-only services).
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

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

# Voice infrastructure
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
LIVEKIT_URL=${LIVEKIT_URL}
LIVEKIT_EXTERNAL_URL=${LIVEKIT_EXTERNAL_URL}
TURN_SECRET=${TURN_SECRET}
TURN_HOST=${TURN_HOST}
FEDERATION_SHARED_SECRET=${FEDERATION_SHARED_SECRET}
SERVER_DOMAIN=${SERVER_DOMAIN}

# Ports
POSTGRES_PORT=5432
API_PORT=8000
API_SSL_PORT=8443
SIGNALING_PORT=3001
LIVEKIT_HTTP_PORT=7880
LIVEKIT_TCP_PORT=7881
LIVEKIT_UDP_PORT=7882

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

# Create LiveKit and TURN configuration files with generated values
cat > livekit.yaml <<EOF
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
turn:
  enabled: true
  domain: ${TURN_HOST}
  tls_port: 5349
  udp_port: 3478
  credential: ${TURN_SECRET}
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
EOF

cat > turnserver.conf <<EOF
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=congruity
total-quota=100
bps-capacity=0
stale-nonce
no-multicast-peers
EOF

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

if [ "$CONFIGURE_ONLY" != "true" ]; then
  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:${SIGNALING_PORT:-3001} -sTCP:LISTEN -nP >/dev/null 2>&1; then
      echo -e "${RED}Signaling port ${SIGNALING_PORT:-3001} is already in use${NC}"
      echo "Stop the conflicting process or set SIGNALING_PORT to a free port in .env."
      exit 1
    fi
  fi

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

  # Optional Cloudflare Tunnels setup
  if [ "$SKIP_CLOUDFLARE_PROMPT" != "true" ]; then
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}External Access via Cloudflare Tunnels${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Cloudflare Tunnels provide secure external access without port forwarding."
    echo "This is recommended if you want to access your server from outside your network."
    echo ""
    read -p "Configure Cloudflare Tunnels? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f setup-cloudflare.sh ]; then
            echo -e "${YELLOW}Starting Cloudflare Tunnels setup...${NC}"
            bash setup-cloudflare.sh
        else
            echo -e "${RED}Error: setup-cloudflare.sh not found${NC}"
            echo "Continuing without Cloudflare Tunnels..."
        fi
    else
        echo -e "${YELLOW}↷ Skipped - You can run setup-cloudflare.sh later if needed${NC}"
    fi
  fi
else
  echo -e "\n${YELLOW}Configuration-only mode:${NC} generated files but did not pull/start containers."
fi

# Determine protocol for signaling URL
if [ "${SELFHOSTED_PUBLIC_HOST}" = "localhost" ] || [ "${SELFHOSTED_PUBLIC_HOST}" = "127.0.0.1" ]; then
  SIGNALING_PROTOCOL="ws"
else
  SIGNALING_PROTOCOL="wss"
fi
SIGNALING_PUBLIC_URL="${SIGNALING_PROTOCOL}://${SELFHOSTED_PUBLIC_HOST}:${SIGNALING_PORT:-3001}"
MINIO_PUBLIC_BASE_URL="http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_PORT:-9000}/${MINIO_BUCKET}"

# Create server backend registration SQL template
cat > selfhosted-backend-registration.sql << EOF
-- Congruity Self-Hosted Server Backend Registration
-- 
-- This SQL registers your self-hosted infrastructure with a Congruity server.
-- Run this in your Supabase SQL Editor AFTER creating a server.
-- 
-- Steps:
-- 1. Create a server in the Congruity client
-- 2. Get the server ID (it will be in the URL or you can query: SELECT id, name FROM servers;)
-- 3. Replace YOUR_SERVER_ID_HERE below with the actual server UUID
-- 4. Run this SQL in Supabase SQL Editor

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
  'YOUR_SERVER_ID_HERE',  -- ← Replace this with your server's UUID
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

# Create a quick reference file
cat > QUICKSTART.md << EOF
# Congruity Self-Hosted Quick Reference

## Your Configuration

**Deployment Mode:** ${USE_LOCAL_SUPABASE}
**Supabase URL:** ${API_URL}
**Signaling URL:** ${SIGNALING_PUBLIC_URL}
**LiveKit URL:** ${LIVEKIT_EXTERNAL_URL}
**TURN Host:** ${TURN_HOST}
**MinIO Endpoint:** http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_PORT:-9000}
**MinIO Console:** http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_CONSOLE_PORT:-9001}
**MinIO Bucket:** ${MINIO_BUCKET}

## MinIO Access
- **Username:** ${MINIO_ROOT_USER}
- **Password:** ${MINIO_ROOT_PASSWORD}

## Client Configuration

Edit \`client/.env\`:

\`\`\`env
VITE_SUPABASE_URL=${API_URL}
VITE_SUPABASE_ANON_KEY=<get from Supabase dashboard>
VITE_SIGNALING_URL=${SIGNALING_PUBLIC_URL}
VITE_LIVEKIT_URL=${LIVEKIT_EXTERNAL_URL}
\`\`\`

## Getting Started

### 1. Configure the Client

\`\`\`bash
cd ../client
cp .env.example .env
# Edit .env with the values above
\`\`\`

### 2. Install and Start Client

\`\`\`bash
npm install
npm run dev
\`\`\`

### 3. Create Your Account

1. Open http://localhost:5173 (or your configured SITE_URL)
2. Click "Sign Up"
3. Create your account with email/password

### 4. Create Your First Server

**Option A: Using SQL Script (Easiest)**
\`\`\`bash
# In Supabase SQL Editor, run:
cat create-first-server.sql
# Copy the entire contents and paste into SQL Editor, then click Run
# This will create a server and display the invite code and server ID
\`\`\`

**Option B: Via Client UI**
1. Click the "+" button in the server list
2. Enter server name (e.g., "My Server")
3. Click "Create"
4. Get server ID from URL or SQL: \`SELECT id, name, invite_code FROM servers WHERE owner_id = auth.uid();\`

**Option C: Manual SQL**
\`\`\`sql
-- In Supabase SQL Editor
INSERT INTO public.servers (name, description, owner_id)
VALUES ('My Server', 'My first self-hosted server', auth.uid())
RETURNING id, name, invite_code;
\`\`\`

### 5. Register Self-Hosted Backend

1. Copy the server ID from step 4
2. Edit \`selfhosted-backend-registration.sql\`
3. Replace \`YOUR_SERVER_ID_HERE\` with your actual server ID
4. Run the SQL in Supabase SQL Editor

### 6. Get Your Invite Code

**Option A: Via SQL Editor**
\`\`\`sql
SELECT id, name, invite_code 
FROM public.servers 
WHERE owner_id = auth.uid();
\`\`\`

**Option B: Via Client**
- Right-click your server → "Invite People" → Copy invite code

### 7. Join Your Server

- In the client, click "Join Server" (+ button in server list)
- Paste your invite code
- Click "Join"

You're all set! 🎉

## Service Management

\`\`\`bash
# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f signaling
docker compose logs -f minio

# Restart services
docker compose restart

# Stop services
docker compose down

# Start services
docker compose up -d
\`\`\`

## Troubleshooting

### Can't connect to voice channels
- Check signaling server: \`curl http://${SELFHOSTED_PUBLIC_HOST}:${SIGNALING_PORT:-3001}/health\`
- Verify VITE_SIGNALING_URL in client/.env matches: ${SIGNALING_PUBLIC_URL}

### Can't upload files
- Check MinIO is running: \`docker compose ps minio\`
- Verify bucket exists: \`docker compose exec minio mc ls congruity/${MINIO_BUCKET}\`

### Database connection issues (local Supabase only)
- Check database: \`docker compose logs db\`
- Verify Kong gateway: \`docker compose logs kong\`

## More Help

- Full documentation: \`docs/SELF_HOSTING_GUIDE.md\`
- Report issues: https://github.com/yourusername/congruity/issues
EOF

echo -e "\n${GREEN}╔═══════════════════════════════════════════╗"
echo "║     🎉 Setup Complete!                    ║"
echo "╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "Your Congruity self-hosted infrastructure is now running!"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Service Endpoints${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "${USE_LOCAL_SUPABASE}" = "true" ]; then
  echo -e "  ${YELLOW}Supabase API:${NC}      ${API_URL:-http://localhost:8000}"
  echo -e "  ${YELLOW}PostgreSQL:${NC}        localhost:${POSTGRES_PORT:-5432}"
else
  echo -e "  ${YELLOW}Supabase (Cloud):${NC}  ${API_URL}"
fi
echo -e "  ${YELLOW}Signaling:${NC}         ${SIGNALING_PUBLIC_URL}"
echo -e "  ${YELLOW}LiveKit:${NC}           ${LIVEKIT_EXTERNAL_URL}"
echo -e "  ${YELLOW}TURN Host:${NC}         ${TURN_HOST}:3478"
echo -e "  ${YELLOW}MinIO API:${NC}         http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_PORT:-9000}"
echo -e "  ${YELLOW}MinIO Console:${NC}     http://${SELFHOSTED_PUBLIC_HOST}:${MINIO_CONSOLE_PORT:-9001}"
echo -e "  ${YELLOW}MinIO Bucket:${NC}      ${MINIO_BUCKET}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}MinIO Credentials${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${YELLOW}Username:${NC} ${MINIO_ROOT_USER}"
echo -e "  ${YELLOW}Password:${NC} ${MINIO_ROOT_PASSWORD}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 Important Files Created${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}✓${NC} .env                                  Environment configuration"
echo -e "  ${GREEN}✓${NC} livekit.yaml                          LiveKit runtime configuration"
echo -e "  ${GREEN}✓${NC} turnserver.conf                       TURN runtime configuration"
echo -e "  ${GREEN}✓${NC} selfhosted-backend-registration.sql   SQL to map server to self-hosted backend"
echo -e "  ${GREEN}✓${NC} create-first-server.sql               SQL to create your first server (run AFTER account creation)"
echo -e "  ${GREEN}✓${NC} QUICKSTART.md                         Quick reference guide"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Next Steps${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}1. Configure the Congruity client:${NC}"
echo "   cd ../client"
echo "   cp .env.example .env"
echo "   # Edit .env with these values:"
echo "   VITE_SUPABASE_URL=${API_URL}"
echo "   VITE_SUPABASE_ANON_KEY=<from Supabase dashboard>"
echo "   VITE_SIGNALING_URL=${SIGNALING_PUBLIC_URL}"
echo "   VITE_LIVEKIT_URL=${LIVEKIT_EXTERNAL_URL}"
echo ""
echo -e "${YELLOW}2. Start the client:${NC}"
echo "   npm install"
echo "   npm run dev"
echo ""
if [ "$CONFIGURE_ONLY" = "true" ]; then
  echo -e "${YELLOW}Container start (you requested manual start):${NC}"
  echo "   docker compose up -d"
  echo ""
fi
echo -e "${YELLOW}3. Create your account at http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}4. Create your first server:${NC}"
echo "   - EASY: Run create-first-server.sql in Supabase SQL Editor"
echo "   - OR use the client UI"
echo ""
echo -e "${YELLOW}5. Register self-hosted backend:${NC}"
echo "   - The create-first-server.sql output will show the server ID"
echo "   - Edit selfhosted-backend-registration.sql with that ID"
echo "   - Run in Supabase SQL Editor"
echo ""
echo -e "${YELLOW}6. Get your invite code and join the server!${NC}"
echo "   - The create-first-server.sql output shows your invite code"
echo "   - Use it in the client to join your server"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📚 Documentation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}Quick Reference:${NC}     cat QUICKSTART.md"
echo -e "  ${GREEN}Step-by-Step:${NC}        cat ../docs/SETUP_WORKFLOW.md"
echo -e "  ${GREEN}Full Guide:${NC}          cat ../docs/SELF_HOSTING_GUIDE.md"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Useful Commands${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  docker compose logs -f       # View all logs"
echo "  docker compose logs signaling # View signaling logs"
echo "  docker compose ps           # Check service status"
echo "  docker compose restart      # Restart all services"
echo "  docker compose down         # Stop all services"
echo ""
echo -e "${GREEN}Happy self-hosting! 🎉${NC}"
echo ""
