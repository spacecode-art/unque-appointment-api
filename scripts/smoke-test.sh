#!/usr/bin/env bash
# Runs the ten-step booking flow against a live API and checks every response.
# Works the same on localhost and on the deployed server:
#
#   BASE_URL=http://<server-ip> ./scripts/smoke-test.sh
#
# Needs curl, jq and GNU date (any Linux). Every run registers fresh users, so
# it can be repeated without clearing the database.
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:5001}"
PASSWORD="password123"
RUN_ID="$(date +%s)"
FAILURES=0

# call METHOD PATH [TOKEN] [JSON_BODY]
# Leaves the HTTP status in $STATUS and the response body in $RESPONSE.
call() {
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-sS -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -w $'\n%{http_code}')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$data" ] && args+=(-d "$data")

  local out
  if ! out="$(curl "${args[@]}")"; then
    echo "Could not reach $BASE_URL" >&2
    exit 2
  fi
  STATUS="${out##*$'\n'}"
  RESPONSE="${out%$'\n'*}"
}

# check LABEL EXPECTED_STATUS
check() {
  if [ "$STATUS" = "$2" ]; then
    printf '  ok    %s (%s)\n' "$1" "$STATUS"
  else
    printf '  FAIL  %s: expected %s, got %s\n        %s\n' "$1" "$2" "$STATUS" "$RESPONSE"
    FAILURES=$((FAILURES + 1))
  fi
}

# expect LABEL ACTUAL EXPECTED
expect() {
  if [ "$2" = "$3" ]; then
    printf '  ok    %s (%s)\n' "$1" "$2"
  else
    printf '  FAIL  %s: expected %s, got %s\n' "$1" "$3" "$2"
    FAILURES=$((FAILURES + 1))
  fi
}

step() { printf '\n%s\n' "$1"; }
field() { jq -r "$1" <<< "$RESPONSE"; }
day() { date -u -d "+$1 days" +%Y-%m-%d; }

register() { # NAME EMAIL ROLE
  call POST /users/register "" "{\"name\":\"$1\",\"email\":\"$2\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\",\"role\":\"$3\"}"
  check "register $1" 201
}

# Leaves the token in $TOKEN and the user id in $USER_ID
login() { # EMAIL
  call POST /users/login "" "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
  check "log in $1" 200
  TOKEN="$(field .token)"
  USER_ID="$(field .id)"
}

# Leaves the new slot's id in $SLOT_ID
add_slot() { # START END
  call POST /professor/availability "$PROF_TOKEN" "{\"startTime\":\"$1\",\"endTime\":\"$2\"}"
  check "add slot $1" 201
  SLOT_ID="$(field .slot.id)"
}

book() { # TOKEN SLOT_ID
  call POST /general/book "$1" "{\"slotId\":\"$2\"}"
}

D1="$(day 7)"
D2="$(day 8)"

step "1. Student A1 authenticates"
register "Student A1" "a1-$RUN_ID@test.com" student
login "a1-$RUN_ID@test.com"
A1_TOKEN="$TOKEN"
A1_ID="$USER_ID"

step "2. Professor P1 authenticates"
register "Professor P1" "p1-$RUN_ID@test.com" professor
login "p1-$RUN_ID@test.com"
PROF_TOKEN="$TOKEN"
PROF_ID="$USER_ID"

step "3. P1 specifies three free slots"
add_slot "${D1}T10:00:00Z" "${D1}T11:00:00Z"
SLOT_T1="$SLOT_ID"
add_slot "${D1}T11:00:00Z" "${D1}T12:00:00Z"
SLOT_T2="$SLOT_ID"
add_slot "${D1}T14:00:00Z" "${D1}T15:00:00Z"
SLOT_T3="$SLOT_ID"

step "4. A1 views P1's available slots"
call GET "/general/professor/$PROF_ID/availability" "$A1_TOKEN"
check "list slots" 200
expect "three free slots" "$(field '.availableSlots | length')" 3

step "5. A1 books the first slot (T1)"
book "$A1_TOKEN" "$SLOT_T1"
check "A1 books T1" 201

step "6. Student A2 authenticates"
register "Student A2" "a2-$RUN_ID@test.com" student
login "a2-$RUN_ID@test.com"
A2_TOKEN="$TOKEN"

step "7. A2 books the second slot (T2)"
book "$A2_TOKEN" "$SLOT_T2"
check "A2 books T2" 201
call GET "/general/professor/$PROF_ID/availability" "$A2_TOKEN"
expect "one slot left free" "$(field '.availableSlots | length')" 1

step "8. P1 moves the free slot (T3) to another day"
call PATCH "/professor/availability/$SLOT_T3" "$PROF_TOKEN" "{\"startTime\":\"${D2}T14:00:00Z\",\"endTime\":\"${D2}T15:30:00Z\"}"
check "update free slot" 200
expect "same slot id, not recreated" "$(field .slot.id)" "$SLOT_T3"
expect "new start time" "$(field .slot.startTime)" "${D2}T14:00:00.000Z"

step "9. P1 cancels the appointment with A1"
call PATCH "/professor/cancel-appointments/$A1_ID" "$PROF_TOKEN"
check "cancel A1's appointment" 200
expect "one appointment cancelled" "$(field .cancelled)" 1

step "10. A1 checks their appointments"
call GET /general/appointments "$A1_TOKEN"
check "list A1's appointments" 200
expect "no pending appointments" "$(field '.appointments | length')" 0

step "Edge cases"
book "$A1_TOKEN" "$SLOT_T2"
check "a booked slot can't be booked again" 409
call PATCH "/professor/availability/$SLOT_T3" "$A1_TOKEN" "{\"startTime\":\"${D2}T16:00:00Z\",\"endTime\":\"${D2}T17:00:00Z\"}"
check "a student can't edit a slot" 403
call PATCH "/professor/availability/$SLOT_T2" "$PROF_TOKEN" "{\"startTime\":\"${D2}T09:00:00Z\",\"endTime\":\"${D2}T10:00:00Z\"}"
check "a booked slot can't be edited" 409
call GET /general/appointments
check "a request without a token is refused" 401

echo
if [ "$FAILURES" -eq 0 ]; then
  echo "All checks passed against $BASE_URL"
else
  echo "$FAILURES check(s) failed against $BASE_URL"
  exit 1
fi