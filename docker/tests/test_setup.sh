#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DOCKER_DIR="${REPO_ROOT}/docker"

TESTS_RUN=0
TESTS_FAILED=0

fail() {
  echo "FAIL: $*" >&2
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

pass() {
  echo "PASS: $*"
}

assert_file_exists() {
  local path="$1"
  local label="$2"
  if [ ! -f "${path}" ]; then
    fail "${label} (missing file: ${path})"
    return 1
  fi
}

assert_dir_exists() {
  local path="$1"
  local label="$2"
  if [ ! -d "${path}" ]; then
    fail "${label} (missing directory: ${path})"
    return 1
  fi
}

assert_not_exists() {
  local path="$1"
  local label="$2"
  if [ -e "${path}" ]; then
    fail "${label} (unexpected path exists: ${path})"
    return 1
  fi
}

assert_contains() {
  local path="$1"
  local needle="$2"
  local label="$3"
  if ! grep -Fq "${needle}" "${path}"; then
    fail "${label} (missing '${needle}' in ${path})"
    return 1
  fi
}

assert_string_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"
  if [[ "${haystack}" != *"${needle}"* ]]; then
    fail "${label} (missing '${needle}')"
    return 1
  fi
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [ "${actual}" -ne "${expected}" ]; then
    fail "${label} (expected ${expected}, got ${actual})"
    return 1
  fi
}

make_fixture() {
  local tmp
  tmp=$(mktemp -d)

  mkdir -p "${tmp}/docker" "${tmp}/server" "${tmp}/bin"
  cp "${DOCKER_DIR}/setup.sh" "${tmp}/docker/setup.sh"
  cp "${DOCKER_DIR}/docker-compose.yml" "${tmp}/docker/docker-compose.yml"

  if [ -f "${DOCKER_DIR}/create-first-server.sql" ]; then
    cp "${DOCKER_DIR}/create-first-server.sql" "${tmp}/docker/create-first-server.sql"
  else
    cat > "${tmp}/docker/create-first-server.sql" <<'EOF'
-- placeholder fixture
EOF
  fi

  cat > "${tmp}/server/Dockerfile" <<'EOF'
FROM busybox
CMD ["true"]
EOF

  cat > "${tmp}/bin/docker" <<'EOF'
#!/usr/bin/env sh
if [ "$1" = "compose" ] && [ "$2" = "version" ]; then
  echo "Docker Compose version v2.test"
  exit 0
fi
if [ "$1" = "info" ]; then
  echo "Server Version: test"
  exit 0
fi
echo "stub docker $*" >&2
exit 0
EOF
  chmod +x "${tmp}/bin/docker"

  printf '%s\n' "${tmp}"
}

make_fixture_with_port_conflict() {
  local fixture
  fixture=$(make_fixture)

  cat > "${fixture}/bin/lsof" <<'EOF'
#!/usr/bin/env sh
case "$*" in
  *"-iTCP:3001"*)
    echo "COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME"
    echo "node 123 test 1u IPv4 0 0 TCP *:3001 (LISTEN)"
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
EOF
  chmod +x "${fixture}/bin/lsof"

  printf '%s\n' "${fixture}"
}

run_setup_capture() {
  local fixture="$1"
  local output_file="$2"
  shift 2

  set +e
  (
    cd "${fixture}/docker"
    PATH="${fixture}/bin:${PATH}" "$@"
  ) >"${output_file}" 2>&1
  RUN_STATUS=$?
  set -e
}

test_cloud_mode_configure_only() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture output
  fixture=$(make_fixture)
  output="${fixture}/cloud.out"

  run_setup_capture "${fixture}" "${output}" \
    env \
      DEPLOY_MODE=1 \
      SITE_URL="http://localhost:5173" \
      API_URL="https://alpha.supabase.co" \
      SELFHOSTED_PUBLIC_HOST="voice.alpha.example" \
      MINIO_BUCKET="alpha-media" \
      DASHBOARD_USER="adminuser" \
      DASHBOARD_PASS="dash-pass-123" \
      POSTGRES_PASSWORD="pg-pass" \
      JWT_SECRET="jwt-secret" \
      SECRET_KEY_BASE="secret-key-base" \
      MINIO_ROOT_PASSWORD="minio-root-pass" \
      SETUP_GENERATED_AT="2026-02-24T00:00:00Z" \
      bash ./setup.sh --configure-only --non-interactive

  assert_status "${RUN_STATUS}" 0 "cloud configure-only exits successfully" || return 1
  assert_file_exists "${fixture}/docker/.env" "cloud mode writes .env" || return 1
  assert_file_exists "${fixture}/docker/QUICKSTART.md" "cloud mode writes QUICKSTART.md" || return 1
  assert_file_exists "${fixture}/docker/selfhosted-backend-registration.sql" "cloud mode writes backend registration SQL" || return 1
  assert_file_exists "${fixture}/docker/livekit.yaml" "cloud mode writes livekit config" || return 1
  assert_file_exists "${fixture}/docker/turnserver.conf" "cloud mode writes turn config" || return 1
  assert_dir_exists "${fixture}/docker/volumes/db/init" "cloud mode creates db init dir" || return 1
  assert_not_exists "${fixture}/docker/volumes/api/kong.yml" "cloud mode does not create kong config" || return 1

  assert_contains "${fixture}/docker/.env" "USE_LOCAL_SUPABASE=false" "cloud mode sets local supabase false" || return 1
  assert_contains "${fixture}/docker/.env" "API_EXTERNAL_URL=https://alpha.supabase.co" "cloud mode stores cloud Supabase URL" || return 1
  assert_contains "${fixture}/docker/.env" "LIVEKIT_API_KEY=devkey" "cloud mode stores livekit api key" || return 1
  assert_contains "${fixture}/docker/.env" "TURN_HOST=voice.alpha.example" "cloud mode stores turn host" || return 1
  assert_contains "${fixture}/docker/.env" "SELFHOSTED_PUBLIC_HOST=voice.alpha.example" "cloud mode stores public host" || return 1
  assert_contains "${fixture}/docker/.env" "# Generated on 2026-02-24T00:00:00Z" "cloud mode uses deterministic generated timestamp" || return 1

  assert_contains "${fixture}/docker/selfhosted-backend-registration.sql" "wss://voice.alpha.example:3001" "cloud mode uses wss signaling URL for non-local host" || return 1
  assert_contains "${fixture}/docker/selfhosted-backend-registration.sql" "alpha-media" "cloud mode uses configured bucket in SQL" || return 1
  assert_contains "${fixture}/docker/QUICKSTART.md" "**Supabase URL:** https://alpha.supabase.co" "quickstart includes cloud supabase URL" || return 1
  assert_contains "${fixture}/docker/QUICKSTART.md" "**Signaling URL:** wss://voice.alpha.example:3001" "quickstart includes signaling URL" || return 1
  assert_contains "${output}" "Configuration-only mode" "output notes configure-only behavior" || return 1
  assert_contains "${output}" "docker compose up -d" "output includes manual compose start step" || return 1

  pass "cloud mode configure-only generation"
}

test_local_mode_generates_kong() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture output
  fixture=$(make_fixture)
  output="${fixture}/local.out"

  run_setup_capture "${fixture}" "${output}" \
    env \
      DEPLOY_MODE=2 \
      SITE_URL="http://localhost:5173" \
      API_URL="http://localhost:8000" \
      SELFHOSTED_PUBLIC_HOST="localhost" \
      MINIO_BUCKET="local-media" \
      DASHBOARD_USER="admin" \
      DASHBOARD_PASS="pw" \
      POSTGRES_PASSWORD="pg-pass" \
      JWT_SECRET="jwt-secret" \
      SECRET_KEY_BASE="secret-key-base" \
      MINIO_ROOT_PASSWORD="minio-root-pass" \
      SETUP_GENERATED_AT="2026-02-24T00:00:00Z" \
      bash ./setup.sh --configure-only --non-interactive

  assert_status "${RUN_STATUS}" 0 "local mode configure-only exits successfully" || return 1
  assert_file_exists "${fixture}/docker/.env" "local mode writes .env" || return 1
  assert_file_exists "${fixture}/docker/volumes/api/kong.yml" "local mode creates kong config" || return 1
  assert_contains "${fixture}/docker/.env" "USE_LOCAL_SUPABASE=true" "local mode sets local supabase true" || return 1
  assert_contains "${fixture}/docker/.env" "API_EXTERNAL_URL=http://localhost:8000" "local mode stores local API URL" || return 1
  assert_contains "${fixture}/docker/.env" "LIVEKIT_URL=ws://livekit:7880" "local mode stores internal livekit url" || return 1
  assert_contains "${fixture}/docker/selfhosted-backend-registration.sql" "ws://localhost:3001" "localhost signaling uses ws protocol" || return 1
  assert_contains "${fixture}/docker/QUICKSTART.md" "**Deployment Mode:** true" "quickstart reflects local supabase mode" || return 1

  pass "local mode configure-only generation"
}

test_cloud_mode_requires_supabase_url() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture output
  fixture=$(make_fixture)
  output="${fixture}/missing-cloud-url.out"

  run_setup_capture "${fixture}" "${output}" \
    env \
      DEPLOY_MODE=1 \
      SITE_URL="http://localhost:5173" \
      API_URL="" \
      SELFHOSTED_PUBLIC_HOST="localhost" \
      MINIO_BUCKET="congruity-media" \
      DASHBOARD_USER="admin" \
      DASHBOARD_PASS="pw" \
      POSTGRES_PASSWORD="pg-pass" \
      JWT_SECRET="jwt-secret" \
      SECRET_KEY_BASE="secret-key-base" \
      MINIO_ROOT_PASSWORD="minio-root-pass" \
      bash ./setup.sh --configure-only --non-interactive

  assert_status "${RUN_STATUS}" 1 "cloud mode without Supabase URL fails" || return 1
  assert_contains "${output}" "Cloud Supabase URL is required in mode 1" "missing cloud URL emits clear error" || return 1

  pass "cloud mode validates required Supabase URL"
}

test_noninteractive_can_skip_reconfigure_existing_env() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture output
  fixture=$(make_fixture)
  output="${fixture}/skip-reconfigure.out"

  cat > "${fixture}/docker/.env" <<'EOF'
USE_LOCAL_SUPABASE=false
API_URL=https://existing.supabase.co
API_EXTERNAL_URL=https://existing.supabase.co
SITE_URL=http://localhost:5173
SELFHOSTED_PUBLIC_HOST=existing.example
MINIO_BUCKET=existing-media
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=existing-minio-pass
SIGNALING_PORT=3001
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
EOF

  run_setup_capture "${fixture}" "${output}" \
    env \
      SETUP_RECONFIGURE_EXISTING=false \
      bash ./setup.sh --configure-only --non-interactive --skip-prereq-checks

  assert_status "${RUN_STATUS}" 0 "non-interactive skip reconfigure exits successfully" || return 1
  assert_contains "${fixture}/docker/.env" "API_URL=https://existing.supabase.co" "existing env file preserved when reconfigure is skipped" || return 1
  assert_contains "${output}" "Skipping configuration (non-interactive mode)" "output confirms reconfigure skip" || return 1
  assert_contains "${fixture}/docker/selfhosted-backend-registration.sql" "wss://existing.example:3001" "post-skip generated SQL uses sourced env values" || return 1

  pass "non-interactive skip reconfigure path"
}

test_runtime_preflight_fails_on_port_conflict() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture output
  fixture=$(make_fixture_with_port_conflict)
  output="${fixture}/port-conflict.out"

  run_setup_capture "${fixture}" "${output}" \
    env \
      DEPLOY_MODE=1 \
      SITE_URL="http://localhost:5173" \
      API_URL="https://alpha.supabase.co" \
      SELFHOSTED_PUBLIC_HOST="localhost" \
      MINIO_BUCKET="alpha-media" \
      DASHBOARD_USER="admin" \
      DASHBOARD_PASS="pw" \
      POSTGRES_PASSWORD="pg-pass" \
      JWT_SECRET="jwt-secret" \
      SECRET_KEY_BASE="secret-key-base" \
      MINIO_ROOT_PASSWORD="minio-root-pass" \
      bash ./setup.sh --non-interactive

  assert_status "${RUN_STATUS}" 1 "runtime preflight fails when signaling port is in use" || return 1
  assert_contains "${output}" "Signaling port 3001 is already in use" "preflight reports conflicting signaling port" || return 1

  pass "runtime preflight detects port conflict"
}

test_bash_syntax() {
  TESTS_RUN=$((TESTS_RUN + 1))
  if bash -n "${DOCKER_DIR}/setup.sh"; then
    pass "setup.sh bash -n"
  else
    fail "setup.sh bash -n"
    return 1
  fi
}

test_compose_file_has_required_services() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local compose_file
  compose_file="${DOCKER_DIR}/docker-compose.yml"

  assert_file_exists "${compose_file}" "docker compose file exists" || return 1
  assert_contains "${compose_file}" "minio:" "compose defines MinIO service" || return 1
  assert_contains "${compose_file}" "signaling:" "compose defines signaling service" || return 1
  assert_contains "${compose_file}" "kong:" "compose defines Kong service" || return 1
  assert_contains "${compose_file}" "livekit:" "compose defines LiveKit service" || return 1
  assert_contains "${compose_file}" "coturn:" "compose defines coturn service" || return 1
  assert_contains "${compose_file}" "minio-init:" "compose defines MinIO init job" || return 1
  assert_contains "${compose_file}" "context: ../server" "compose builds signaling from server Dockerfile" || return 1

  pass "docker compose file includes required self-host services"
}

test_compose_config_optional() {
  TESTS_RUN=$((TESTS_RUN + 1))
  local fixture
  local services resolved
  fixture=$(make_fixture)

  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    pass "docker compose config smoke (skipped: docker compose unavailable)"
    return 0
  fi

  (
    cd "${fixture}/docker"
    DEPLOY_MODE=2 \
      SITE_URL="http://localhost:5173" \
      API_URL="http://localhost:8000" \
      SELFHOSTED_PUBLIC_HOST="localhost" \
      MINIO_BUCKET="local-media" \
      DASHBOARD_USER="admin" \
      DASHBOARD_PASS="pw" \
      POSTGRES_PASSWORD="pg-pass" \
      JWT_SECRET="jwt-secret" \
      SECRET_KEY_BASE="secret-key-base" \
      MINIO_ROOT_PASSWORD="minio-root-pass" \
      bash ./setup.sh --configure-only --non-interactive --skip-prereq-checks >/dev/null 2>&1

    services=$(docker compose config --services)
    resolved=$(docker compose config)

    assert_string_contains "${services}" "signaling" "compose services include signaling" || exit 1
    assert_string_contains "${services}" "minio" "compose services include minio" || exit 1
    assert_string_contains "${services}" "kong" "compose services include kong" || exit 1
    assert_string_contains "${resolved}" "CORS_ORIGIN: http://localhost:5173" "resolved compose config wires signaling CORS to SITE_URL" || exit 1
  ) || return 1

  pass "docker compose config smoke + service assertions"
}

main() {
  test_bash_syntax || true
  test_compose_file_has_required_services || true
  test_cloud_mode_configure_only || true
  test_local_mode_generates_kong || true
  test_cloud_mode_requires_supabase_url || true
  test_noninteractive_can_skip_reconfigure_existing_env || true
  test_runtime_preflight_fails_on_port_conflict || true
  test_compose_config_optional || true

  echo
  echo "Setup script tests run: ${TESTS_RUN}"
  if [ "${TESTS_FAILED}" -ne 0 ]; then
    echo "Setup script tests failed: ${TESTS_FAILED}" >&2
    exit 1
  fi
  echo "All setup script tests passed."
}

main "$@"
