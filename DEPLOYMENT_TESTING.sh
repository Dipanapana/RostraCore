#!/bin/bash

###############################################################################
# RostraCore Deployment Testing Script
#
# Tests all critical endpoints to verify deployment readiness
#
# Usage:
#   ./DEPLOYMENT_TESTING.sh [API_URL]
#
# Example:
#   ./DEPLOYMENT_TESTING.sh http://localhost:8000
#   ./DEPLOYMENT_TESTING.sh https://api.yourdomain.com
###############################################################################

# Configuration
API_URL="${1:-http://localhost:8000}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5

    log_info "Testing: $description"

    if [ "$method" == "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    if [ "$response" == "$expected_status" ]; then
        log_success "$description - Status: $response"
    else
        log_error "$description - Expected: $expected_status, Got: $response"
    fi
}

# Test function with JSON validation
test_endpoint_json() {
    local endpoint=$1
    local description=$2
    local expected_field=$3

    log_info "Testing: $description"

    response=$(curl -s "$API_URL$endpoint")

    if echo "$response" | jq -e ".$expected_field" > /dev/null 2>&1; then
        log_success "$description - JSON valid with field '$expected_field'"
    else
        log_error "$description - JSON missing field '$expected_field'"
        echo "Response: $response" | head -c 200
    fi
}

# Print header
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  RostraCore Deployment Testing Suite${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "Testing API: ${YELLOW}$API_URL${NC}\n"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_warning "jq not installed. JSON validation tests will be skipped."
    log_warning "Install with: sudo apt-get install jq"
    HAS_JQ=false
else
    HAS_JQ=true
fi

###############################################################################
# SECTION 1: Core Health & Infrastructure
###############################################################################

echo -e "\n${BLUE}━━━ Section 1: Core Health & Infrastructure ━━━${NC}\n"

test_endpoint "GET" "/" "200" "Root endpoint"
test_endpoint "GET" "/health" "200" "Health check endpoint"

if [ "$HAS_JQ" = true ]; then
    test_endpoint_json "/health" "Health check JSON structure" "status"
fi

###############################################################################
# SECTION 2: Phase 2 - Intelligence Layer Dashboards
###############################################################################

echo -e "\n${BLUE}━━━ Section 2: Intelligence Layer Dashboards ━━━${NC}\n"

# Executive Dashboard
test_endpoint "GET" "/api/v1/dashboards/executive" "200" "Executive Dashboard"
if [ "$HAS_JQ" = true ]; then
    test_endpoint_json "/api/v1/dashboards/executive" "Executive Dashboard - Revenue data" "revenue"
    test_endpoint_json "/api/v1/dashboards/executive" "Executive Dashboard - Metrics" "total_guards"
fi

# Operations Dashboard
test_endpoint "GET" "/api/v1/dashboards/operations" "200" "Operations Dashboard"
if [ "$HAS_JQ" = true ]; then
    test_endpoint_json "/api/v1/dashboards/operations" "Operations Dashboard - Unfilled shifts" "unfilled_shifts"
    test_endpoint_json "/api/v1/dashboards/operations" "Operations Dashboard - Current status" "guards_on_shift_now"
fi

# Financial Dashboard
test_endpoint "GET" "/api/v1/dashboards/financial" "200" "Financial Dashboard"
if [ "$HAS_JQ" = true ]; then
    test_endpoint_json "/api/v1/dashboards/financial" "Financial Dashboard - Budget" "budget"
    test_endpoint_json "/api/v1/dashboards/financial" "Financial Dashboard - Payroll" "payroll"
fi

# People Analytics Dashboard
test_endpoint "GET" "/api/v1/dashboards/people-analytics" "200" "People Analytics Dashboard"
if [ "$HAS_JQ" = true ]; then
    test_endpoint_json "/api/v1/dashboards/people-analytics" "People Analytics - Fairness score" "fairness_score"
    test_endpoint_json "/api/v1/dashboards/people-analytics" "People Analytics - Risk guards" "guards_at_risk"
fi

###############################################################################
# SECTION 3: Phase 3 - Predictive Intelligence
###############################################################################

echo -e "\n${BLUE}━━━ Section 3: Predictive Intelligence (ML Models) ━━━${NC}\n"

# Shift Fill Prediction
shift_data='{
  "shift_start": "2025-11-10T08:00:00",
  "shift_end": "2025-11-10T16:00:00",
  "site_id": 1
}'
test_endpoint "POST" "/api/v1/predictions/shift-fill" "200" "Shift Fill Prediction" "$shift_data"

# Roster Prediction
roster_data='{
  "shifts": [
    {
      "shift_start": "2025-11-10T08:00:00",
      "shift_end": "2025-11-10T16:00:00",
      "site_id": 1
    }
  ]
}'
test_endpoint "POST" "/api/v1/predictions/roster-success" "200" "Roster Success Prediction" "$roster_data"

# Churn Prediction Endpoints
test_endpoint "GET" "/api/v1/predictions/churn/at-risk?min_risk_level=medium" "200" "At-Risk Employees (Churn)"
test_endpoint "GET" "/api/v1/predictions/churn/statistics" "200" "Churn Statistics"

# Historical Patterns
test_endpoint "GET" "/api/v1/predictions/patterns/fill-rate-by-hour" "200" "Fill Rate by Hour Pattern"
test_endpoint "GET" "/api/v1/predictions/patterns/fill-rate-by-day" "200" "Fill Rate by Day Pattern"
test_endpoint "GET" "/api/v1/predictions/patterns/difficult-to-fill" "200" "Difficult to Fill Patterns"

###############################################################################
# SECTION 4: Job Queue System (Phase 1C)
###############################################################################

echo -e "\n${BLUE}━━━ Section 4: Background Job System ━━━${NC}\n"

# Note: We can't easily test async jobs without creating actual jobs
# These endpoints should return 404 for non-existent jobs or require auth
log_info "Testing: Job Status Endpoint (should return 404 for non-existent job)"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/jobs/status/test-job-id")
if [ "$response" == "404" ] || [ "$response" == "200" ]; then
    log_success "Job Status Endpoint - Responding correctly: $response"
else
    log_error "Job Status Endpoint - Unexpected response: $response"
fi

###############################################################################
# SECTION 5: Core API Endpoints
###############################################################################

echo -e "\n${BLUE}━━━ Section 5: Core API Endpoints ━━━${NC}\n"

# These might require authentication, so 401/403 is acceptable
test_endpoint "GET" "/api/v1/employees" "200|401|403" "Employees Endpoint"
test_endpoint "GET" "/api/v1/sites" "200|401|403" "Sites Endpoint"
test_endpoint "GET" "/api/v1/shifts" "200|401|403" "Shifts Endpoint"

###############################################################################
# SECTION 6: API Documentation
###############################################################################

echo -e "\n${BLUE}━━━ Section 6: API Documentation ━━━${NC}\n"

test_endpoint "GET" "/docs" "200" "Swagger Documentation"
test_endpoint "GET" "/redoc" "200" "ReDoc Documentation"
test_endpoint "GET" "/openapi.json" "200" "OpenAPI Specification"

###############################################################################
# SECTION 7: Performance & Caching Tests
###############################################################################

echo -e "\n${BLUE}━━━ Section 7: Performance & Caching ━━━${NC}\n"

log_info "Testing: Response time for cached dashboard (Executive)"
start_time=$(date +%s%N)
curl -s "$API_URL/api/v1/dashboards/executive" > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000)) # Convert to milliseconds

if [ $elapsed -lt 1000 ]; then
    log_success "Executive Dashboard response time: ${elapsed}ms (< 1000ms)"
else
    log_warning "Executive Dashboard response time: ${elapsed}ms (should be < 1000ms when cached)"
fi
((TOTAL_TESTS++))

log_info "Testing: Second request should be faster (cached)"
start_time=$(date +%s%N)
curl -s "$API_URL/api/v1/dashboards/executive" > /dev/null
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))

if [ $elapsed -lt 500 ]; then
    log_success "Cached Executive Dashboard response time: ${elapsed}ms (< 500ms)"
else
    log_warning "Cached response time: ${elapsed}ms (should be < 500ms when cached)"
fi
((TOTAL_TESTS++))

###############################################################################
# SECTION 8: Redis Cache Verification (if Redis CLI available)
###############################################################################

echo -e "\n${BLUE}━━━ Section 8: Redis Cache Verification ━━━${NC}\n"

if command -v redis-cli &> /dev/null; then
    log_info "Checking Redis cache keys..."

    cache_keys=$(redis-cli KEYS "dashboard:*" 2>/dev/null | wc -l)
    if [ "$cache_keys" -gt 0 ]; then
        log_success "Redis cache active - Found $cache_keys dashboard cache keys"
    else
        log_warning "Redis cache - No dashboard keys found (may need first request)"
    fi
    ((TOTAL_TESTS++))

    # Check Redis memory
    redis_memory=$(redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2)
    if [ ! -z "$redis_memory" ]; then
        log_info "Redis memory usage: $redis_memory"
    fi
else
    log_warning "redis-cli not available. Skipping Redis verification."
fi

###############################################################################
# SECTION 9: Database Connection Test
###############################################################################

echo -e "\n${BLUE}━━━ Section 9: Database Connection ━━━${NC}\n"

log_info "Testing database connection via health endpoint..."
if [ "$HAS_JQ" = true ]; then
    db_status=$(curl -s "$API_URL/health" | jq -r '.database.status' 2>/dev/null)
    if [ "$db_status" == "healthy" ] || [ "$db_status" == "connected" ]; then
        log_success "Database connection - Status: $db_status"
    else
        log_warning "Database status: $db_status (check health endpoint response)"
    fi
    ((TOTAL_TESTS++))
fi

###############################################################################
# SECTION 10: Celery Workers Test
###############################################################################

echo -e "\n${BLUE}━━━ Section 10: Celery Workers ━━━${NC}\n"

if command -v celery &> /dev/null; then
    log_info "Checking Celery workers..."

    # Try to inspect active workers (requires access to celery app)
    # This might not work in all deployment scenarios
    log_warning "Celery worker check requires access to celery CLI"
    log_info "Manually verify workers with: celery -A app.celery_app inspect active"
else
    log_warning "Celery CLI not available. Cannot verify workers."
    log_info "Check Flower dashboard or manually verify Celery workers are running"
fi

###############################################################################
# FINAL REPORT
###############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Results Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "Total Tests:   ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:        ${RED}$FAILED_TESTS${NC}"

success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Success Rate:  ${YELLOW}$success_rate%${NC}"

echo -e "\n${BLUE}━━━ Deployment Readiness Status ━━━${NC}\n"

if [ $success_rate -ge 95 ]; then
    echo -e "${GREEN}✅ EXCELLENT${NC} - System is production-ready!"
    echo -e "   All critical endpoints are functioning correctly."
elif [ $success_rate -ge 80 ]; then
    echo -e "${YELLOW}⚠️  GOOD${NC} - System is mostly ready, but review failures."
    echo -e "   Some non-critical endpoints may need attention."
elif [ $success_rate -ge 60 ]; then
    echo -e "${YELLOW}⚠️  FAIR${NC} - System has issues that should be resolved."
    echo -e "   Review failed tests before deploying to production."
else
    echo -e "${RED}❌ NEEDS WORK${NC} - Critical issues detected."
    echo -e "   Resolve failures before deployment."
fi

echo -e "\n${BLUE}━━━ Next Steps ━━━${NC}\n"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "1. ✅ All tests passed! System is ready for deployment."
    echo "2. 📝 Review DEPLOYMENT_READINESS.md for deployment steps"
    echo "3. 🚀 Deploy to production environment"
    echo "4. 📊 Monitor Sentry dashboard for errors"
    echo "5. 👥 Begin user acceptance testing"
else
    echo "1. 🔍 Review failed tests above"
    echo "2. 🛠️  Fix failing endpoints"
    echo "3. 🔄 Re-run this test script"
    echo "4. 📝 Check logs for detailed error messages"
fi

echo -e "\n${BLUE}━━━ Monitoring URLs ━━━${NC}\n"
echo "API Documentation:  $API_URL/docs"
echo "Health Check:       $API_URL/health"
echo "Executive Dashboard: $API_URL/api/v1/dashboards/executive"
echo "Sentry:             https://sentry.io (if configured)"
echo "Flower:             http://your-server:5555 (if running)"

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi
