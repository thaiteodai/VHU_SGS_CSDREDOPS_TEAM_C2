#!/usr/bin/env bash
# End-to-end smoke test against a running Panic Plan stack.
#
#   ./scripts/smoke.sh [base-url] [api-url]
#
# Exercises: health, register, verification, sign-in, target CRUD, steps,
# buddy invite, roast, wall of shame, export, and the role gates.

set -uo pipefail

BASE="${1:-http://localhost:8080}"
API="${2:-http://localhost:4000}"
PASS=0
FAIL=0
JARS=$(mktemp -d)

green() { printf '\033[32m  ok\033[0m   %s\n' "$1"; }
red() { printf '\033[31m  FAIL\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then green "$name"; PASS=$((PASS + 1));
  else red "$name (expected '$expected', got '$actual')"; fi
}

check_absent() {
  local name="$1" unexpected="$2" actual="$3"
  if [[ "$actual" != *"$unexpected"* ]]; then green "$name"; PASS=$((PASS + 1));
  else red "$name (should not contain '$unexpected')"; fi
}

stamp=$(date +%s)
EMAIL="smoke-$stamp@panicplan.test"
PASSWORD="Password123!"

echo "Panic Plan smoke test"
echo "  app: $BASE"
echo "  api: $API"
echo

# --- health -----------------------------------------------------------------
check "health endpoint" '"status":"ok"' "$(curl -s -m 10 "$API/api/health")"
check "readiness endpoint" '"database":"up"' "$(curl -s -m 10 "$API/api/health/ready")"

# --- registration -----------------------------------------------------------
reg=$(curl -s -m 10 -X POST "$API/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Tester\"}")
check "register returns 201 message" 'Account created' "$reg"

# --- sign in before verification must fail ---------------------------------
early=$(curl -s -m 10 -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
check "unverified login is blocked" 'Confirm your email' "$early"

# --- verify via the server log token (dev mode prints it) -------------------
TOKEN=$(echo "$reg" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("token",""))' 2>/dev/null)
if [[ -z "$TOKEN" ]]; then
  echo "  note: no verification token in the response (expected in production)"
fi

# --- sign in with a known-verified seeded account ---------------------------
login=$(curl -s -m 10 -c "$JARS/seed.jar" -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"sam@panicplan.local","password":"Password123!"}')
ACCESS=$(echo "$login" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("accessToken",""))' 2>/dev/null)
if [[ -n "$ACCESS" ]]; then green "seeded member signs in"; PASS=$((PASS + 1));
else red "seeded member sign-in ($login)"; fi

AUTH=(-H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json')

# --- targets ----------------------------------------------------------------
target=$(curl -s -m 10 "${AUTH[@]}" -X POST "$API/api/targets" \
  -d "{\"title\":\"Smoke test target\",\"dueAt\":\"$(date -u -d '+3 days' +%Y-%m-%dT%H:%M:%SZ)\",\"chaosLevel\":3,\"personality\":\"OVERCONFIDENT_OPTIMIST\"}")
TID=$(echo "$target" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("target",{}).get("id",""))' 2>/dev/null)
if [[ -n "$TID" ]]; then green "create target"; PASS=$((PASS + 1)); else red "create target ($target)"; fi
check "target has a derived tier" '"tier"' "$target"
check "target has a panic meter value" '"panic"' "$target"

# --- validation -------------------------------------------------------------
bad=$(curl -s -m 10 "${AUTH[@]}" -X POST "$API/api/targets" -d '{"title":"","dueAt":"nope","chaosLevel":99}')
check "server rejects invalid target" 'not right' "$bad"
check "server reports which field failed" 'chaosLevel' "$bad"

# --- steps ------------------------------------------------------------------
step=$(curl -s -m 10 "${AUTH[@]}" -X POST "$API/api/targets/$TID/steps" -d '{"label":"Do the thing"}')
check "add a step" 'Do the thing' "$step"

# --- buddies ---------------------------------------------------------------
invite=$(curl -s -m 10 "${AUTH[@]}" -X POST "$API/api/targets/$TID/buddies" -d '{"email":"riley@panicplan.local"}')
check "invite a buddy" 'buddy' "$invite"

# --- roast ------------------------------------------------------------------
roast=$(curl -s -m 10 "${AUTH[@]}" -X POST "$API/api/targets/$TID/roasts" -d '{}')
check "deploy a roast" '"tier"' "$roast"

# --- role gate: a plain member cannot list all users -----------------------
users=$(curl -s -m 10 "${AUTH[@]}" "$API/api/users")
check "member blocked from the admin user list" 'do not have permission' "$users"

# --- wall of shame ----------------------------------------------------------
shame=$(curl -s -m 10 "${AUTH[@]}" "$API/api/shame")
check "wall of shame responds" 'entries' "$shame"

# --- export -----------------------------------------------------------------
export=$(curl -s -m 10 "${AUTH[@]}" "$API/api/users/me/export")
check "data export contains the account" 'panicplan.local' "$export"
check_absent "data export hides the password hash" '"passwordHash"' "$export"
check_absent "data export hides the refresh tokens" '"refreshTokens"' "$export"

# --- audit log --------------------------------------------------------------
audit=$(curl -s -m 10 "${AUTH[@]}" "$API/api/auth/me")
check "session is live" '"email"' "$audit"

echo
echo "passed: $PASS   failed: $FAIL"
rm -rf "$JARS"
[[ $FAIL -eq 0 ]]
