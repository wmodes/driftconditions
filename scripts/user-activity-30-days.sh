#!/bin/bash
#
# user-activity-30-days.sh
# Run on the server to report user login activity over the last 30 days.
# Combines journalctl log analysis with direct DB queries.
#
# Usage: bash scripts/user-activity-30-days.sh
#   or:  ssh debian@driftconditions.org "bash ~/interference/scripts/user-activity-30-days.sh"

DAYS=30
DB_NAME="interference"
DB_USER="mysql"
DB_PASS="my\$ql"

SINCE_DATE=$(date -d "-${DAYS} days" '+%Y-%m-%d %H:%M:%S' 2>/dev/null \
  || date -v-${DAYS}d '+%Y-%m-%d %H:%M:%S')  # macOS fallback
SINCE_JOURNALD=$(date -d "-${DAYS} days" '+%Y-%m-%d' 2>/dev/null \
  || date -v-${DAYS}d '+%Y-%m-%d')

HR="--------------------------------------------------------------------------------"

mysql_q() {
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sNe "$1" 2>/dev/null
}

# Pull all relevant log lines once so we aren't re-running journalctl repeatedly
LOGS=$(journalctl -u adminserver --since "${SINCE_JOURNALD} 00:00:00" 2>/dev/null)

echo
echo "================================================================"
echo "  USER ACTIVITY REPORT — last ${DAYS} days (since ${SINCE_DATE%% *})"
echo "================================================================"
echo

LOG_SINCE=$(echo "$LOGS" | head -1 | awk '{print $1, $2, $3}')
echo "  DB data:  last ${DAYS} days"
echo "  Log data: since ${LOG_SINCE:-unknown}"
echo

# ── UNIQUE USERS ─────────────────────────────────────────────────────────────
echo "$HR"
echo "  UNIQUE USERS WITH LOGIN COUNTS (last ${DAYS} days)"
echo "$HR"
printf "  %-20s %-30s %-10s %s\n" "Username" "Email" "Role" "Logins"
echo "  $(printf '%0.s-' {1..70})"

mysql_q "
  SELECT username, email, roleName, COUNT(*) as logins
  FROM (
    SELECT u.username, u.email, u.roleName, u.lastLoginAt
    FROM users u
    WHERE u.lastLoginAt >= '${SINCE_DATE}'
    GROUP BY u.userID, u.lastLoginAt
  ) sub
  GROUP BY username, email, roleName
  ORDER BY logins DESC, username ASC
" | while IFS=$'\t' read -r username email rolename logins; do
  printf "  %-20s %-30s %-10s %s\n" "$username" "$email" "$rolename" "$logins"
done

echo

# ── DB SUMMARY ───────────────────────────────────────────────────────────────
echo "$HR"
echo "  LOGIN SUMMARY (DB)"
echo "$HR"

UNIQUE_USERS=$(mysql_q "
  SELECT COUNT(DISTINCT userID) FROM users
  WHERE lastLoginAt >= '${SINCE_DATE}'
")

SUCCESSFUL_LOGINS=$(mysql_q "
  SELECT COUNT(*) FROM users
  WHERE lastLoginAt >= '${SINCE_DATE}'
")
# Note: lastLoginAt is updated on every successful login, so this counts
# total successful sessions, not just unique users.

NEW_SIGNUPS=$(mysql_q "
  SELECT COUNT(*) FROM users
  WHERE addedOn >= '${SINCE_DATE}'
")

PASSWORD_RESETS=$(mysql_q "
  SELECT COUNT(*) FROM passwordResetTokens
  WHERE expiresAt >= DATE_SUB('${SINCE_DATE}', INTERVAL 1 HOUR)
" 2>/dev/null || echo "n/a")

printf "  %-40s %s\n" "Unique users who logged in:" "$UNIQUE_USERS"
printf "  %-40s %s\n" "New signups:" "$NEW_SIGNUPS"
printf "  %-40s %s\n" "Password resets requested:" "$PASSWORD_RESETS"
echo

# ── LOG-BASED METRICS ────────────────────────────────────────────────────────
echo "$HR"
echo "  LOGIN ATTEMPT METRICS (logs)"
echo "$HR"

# Total login attempts: local signin POSTs + OAuth initiations
LOCAL_ATTEMPTS=$(echo "$LOGS" | grep -c "Received POST request on /api/auth/signin")
OAUTH_ATTEMPTS=$(echo "$LOGS" | grep -cE "authRoutes:/:provider: redirecting to")
TOTAL_ATTEMPTS=$((LOCAL_ATTEMPTS + OAUTH_ATTEMPTS))

# Successful logins from logs
OAUTH_SUCCESS=$(echo "$LOGS" | grep -cE "authRoutes:/callback: (existing OAuth user|linked .* to existing user|created new user):")
# Local successes: "Authentication successful" appears in the response body, not logged directly.
# We approximate: total attempts minus known failures.
LOCAL_FAIL_418=$(echo "$LOGS" | grep -c "418")  # teapot = bad credentials
LOCAL_SUCCESS=$((LOCAL_ATTEMPTS - LOCAL_FAIL_418))
[ $LOCAL_SUCCESS -lt 0 ] && LOCAL_SUCCESS=0
TOTAL_SUCCESS=$((LOCAL_SUCCESS + OAUTH_SUCCESS))

# Rate limiting (429 / Too Many Requests)
RATE_LIMITED=$(echo "$LOGS" | grep -cE "(429|Too Many Requests|rate.limi)")

# Security rejections (CSRF, bad state, OAuth errors, no email)
REJECTED=$(echo "$LOGS" | grep -cE "(CSRF state mismatch|INVALID_STATE|OAUTH_EXCHANGE_FAILED|NO_EMAIL|not_authenticated|not_authorized)")

# Failed local logins (418 = wrong credentials)
FAILED_LOCAL=$(echo "$LOGS" | grep -c "418")

# Helper to print percent safely
pct() {
  local n=$1 total=$2
  if [ "$total" -gt 0 ]; then
    awk "BEGIN { printf \"%.1f%%\", ($n/$total)*100 }"
  else
    echo "n/a"
  fi
}

printf "  %-40s %s\n" "Total login attempts:" "$TOTAL_ATTEMPTS"
printf "  %-40s %s  local\n" "" "$LOCAL_ATTEMPTS"
printf "  %-40s %s  oauth\n" "" "$OAUTH_ATTEMPTS"
echo

printf "  %-40s %s  (%s of attempts)\n" \
  "Successful sign-ins (approx):" "$TOTAL_SUCCESS" "$(pct $TOTAL_SUCCESS $TOTAL_ATTEMPTS)"
printf "  %-40s %s\n" "" "(local: $LOCAL_SUCCESS, oauth: $OAUTH_SUCCESS)"
echo

printf "  %-40s %s  (%s of attempts)\n" \
  "Rate limited (429):" "$RATE_LIMITED" "$(pct $RATE_LIMITED $TOTAL_ATTEMPTS)"

printf "  %-40s %s  (%s of attempts)\n" \
  "Security rejections:" "$REJECTED" "$(pct $REJECTED $TOTAL_ATTEMPTS)"

printf "  %-40s %s  (%s of attempts)\n" \
  "Failed local logins (bad credentials):" "$FAILED_LOCAL" "$(pct $FAILED_LOCAL $TOTAL_ATTEMPTS)"

# Signups and password resets from logs
SIGNUP_ATTEMPTS=$(echo "$LOGS" | grep -c "Received POST request on /api/auth/signup")
PASSWORD_RESET_REQUESTS=$(echo "$LOGS" | grep -c "authRoutes:/forgot-password: reset email sent")

echo
printf "  %-40s %s\n" "Signup attempts (log):" "$SIGNUP_ATTEMPTS"
printf "  %-40s %s\n" "Password resets sent (log):" "$PASSWORD_RESET_REQUESTS"

echo

# ── ERRORS AND IRREGULARITIES ────────────────────────────────────────────────
echo "$HR"
echo "  ERRORS AND IRREGULARITIES (logs)"
echo "$HR"

ERROR_LINES=$(echo "$LOGS" | grep " error: " | grep -v "No token provided")
ERROR_COUNT=$(echo "$ERROR_LINES" | grep -c " error: " || true)

if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "  $ERROR_COUNT error(s) found:"
  echo
  echo "$ERROR_LINES" | sed 's/.*npm\[[0-9]*\]: /  /' | head -30
else
  echo "  No errors found in available logs."
fi

echo
echo "$HR"
echo
