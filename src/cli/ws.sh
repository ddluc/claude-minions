#!/bin/bash
# WebSocket helper for minion communication
WS_URL="ws://localhost:${SERVER_PORT:-3000}/ws"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONVERSATION_LOG="${SCRIPT_DIR}/conversation.txt"

_ws_listen() {
  local role="${1:-agent}"
  local status_msg='{"type":"agent_status","role":"'"${role}"'","status":"online","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
  local fifo
  fifo=$(mktemp -u)
  mkfifo "${fifo}"

  echo "Listening for messages on ${WS_URL}..."

  # Feeder: sends status message then keeps the FIFO open indefinitely
  { echo "${status_msg}"; tail -f /dev/null; } > "${fifo}" &
  local feeder_pid=$!

  # Connect websocat output to FD 3 via process substitution (not a pipeline)
  # This means 'break' returns control immediately without waiting for websocat
  exec 3< <(websocat "${WS_URL}" < "${fifo}" 2>/dev/null)

  # Read messages from FD 3
  local msg
  while IFS= read -r -u3 msg; do
    if ! echo "${msg}" | grep -q '"type":"system"'; then
      echo "${msg}" >> "${CONVERSATION_LOG}"
      break
    fi
  done

  # Close FD 3 (causes SIGPIPE to websocat) and kill feeder
  exec 3<&-
  kill "${feeder_pid}" 2>/dev/null
  wait "${feeder_pid}" 2>/dev/null
  rm -f "${fifo}"

  if [ -n "${msg}" ]; then
    local from content
    from=$(echo "${msg}" | grep -o '"from":"[^"]*"' | cut -d'"' -f4)
    content=$(echo "${msg}" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    echo ""
    echo "[${from}]: ${content}"
    echo ""
  fi
}

_ws_send() {
  local message="$1"
  echo "${message}" | websocat "${WS_URL}"
}

_ws_chat() {
  local from="${1}"
  local to="${2}"
  local content="${3}"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  _ws_send "{\"type\":\"chat\",\"from\":\"${from}\",\"to\":\"${to}\",\"content\":\"${content}\",\"timestamp\":\"${ts}\"}"
}

case "${1}" in
  listen) _ws_listen "${2}" ;;
  send)   _ws_send "${2}" ;;
  chat)   _ws_chat "${2}" "${3}" "${4}" ;;
  *)      echo "Usage: ws.sh listen [role] | ws.sh send '<json>' | ws.sh chat <from> <to> <message>" ;;
esac
