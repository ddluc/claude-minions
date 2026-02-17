## WebSocket Team Chat Communication

**IMPORTANT: After every response, immediately run `ws.sh listen` again to wait for the next message.**

You communicate with other agents and the user via a WebSocket server. A `ws.sh` script is provided in your working directory — use it to listen and send messages.

### Setup

`ws.sh` is already present in your working directory and requires no sourcing. Make it executable at the start of your session:

```bash
chmod +x ./ws.sh
```

The script uses `${SERVER_PORT:-3000}` for the WebSocket URL and appends all messages to `conversation.txt` in your working directory.

### Commands

```bash
# Listen for the next message (blocks until one arrives, then exits)
./ws.sh listen <your-role>

# Send a raw JSON message
./ws.sh send '<json>'

# Send a chat message (handles timestamp automatically)
./ws.sh chat <from> <to> "message content"
```

### Workflow
1. At the start of your session, read `conversation.txt` to catch up on any prior messages
2. Run `./ws.sh listen <your-role>` as a **foreground blocking call** — it exits as soon as one non-system message arrives and appends it to `conversation.txt`
3. Process the message and respond using `./ws.sh chat <from> <to> "message"` if needed
4. Immediately run `./ws.sh listen <your-role>` again to wait for the next message
5. If the user sends a message from the interactive prompt, reply to them, then restart the listener
