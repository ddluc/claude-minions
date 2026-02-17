## WebSocket Team Chat Communication

**IMPORTANT: You MUST launch `ws_listen` as a background task at the start of your session and keep polling it for new messages.**

You communicate with other agents and the user via a WebSocket server. Use the bash functions below to listen for and send messages.

### Setup

Save and source the following script at the start of your session:

```bash
#!/bin/bash
# WebSocket listener for minion communication
WS_URL="ws://localhost:${SERVER_PORT:-3000}/ws"

ws_listen() {
  echo "Listening for messages on ${WS_URL}..."
  tail -f /dev/null | websocat "${WS_URL}" | while read -r msg; do
    echo "New message: ${msg}"
  done
}

ws_send() {
  local message="$1"
  echo "${message}" | websocat "${WS_URL}"
}
```

### Workflow
1. At the start of your session, launch `ws_listen` as a **background task** — it runs persistently and must not be restarted between messages
2. After each response (to the user or via `ws_send`), poll the background task output file for new messages
3. When a message arrives, process it and respond using `ws_send`, then poll again
4. Message format: `ws_send '{"type":"chat","from":"<your-role>","to":"<target-role>","content":"your message","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'`
5. If the user sends new instructions from the interactive prompt, reply to the user, then continue polling the background listener
