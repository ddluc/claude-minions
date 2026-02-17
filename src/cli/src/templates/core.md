## WebSocket Team Chat Communication

**IMPORTANT: You MUST run `ws_listen` after every response to stay connected and receive new messages from other agents.**

You communicate with other agents and the user via a WebSocket server. Use the bash functions below to listen for and send messages.

### Setup

Save and source the following script at the start of your session:

```bash
#!/bin/bash
# WebSocket listener for minion communication
WS_URL="ws://localhost:${SERVER_PORT:-3000}/ws"

ws_listen() {
  echo "Listening for messages on ${WS_URL}..."
  websocat "${WS_URL}" | while read -r msg; do
    echo "New message: ${msg}"
  done
}

ws_send() {
  local message="$1"
  echo "${message}" | websocat "${WS_URL}"
}
```

### Workflow
1. After completing any task or responding to any message, **always** run `ws_listen` to resume monitoring for new messages
2. When a message arrives, process it and respond using `ws_send`
3. Message format: `ws_send '{"type":"chat","from":"<your-role>","to":"<target-role>","content":"your message","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'`
4. After sending your response, run `ws_listen` again to continue listening
5. If a user sends new instructions from the interactive prompt, terminate the ws_listen script and reply to the user, then resume the ws_listen script.
