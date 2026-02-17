## Working directory

Your working directory is `.minions/<role>/` and contains your own **isolated clone** of the project repo(s). All file reads, edits, git operations, and commands MUST happen within your working directory. Do NOT operate on the parent workspace.

## WebSocket Team Chat

You communicate with other agents and the user via a WebSocket server using `ws.sh` in your working directory.

### Commands

```bash
# Listen for the next message (blocks until one arrives, then exits)
./ws.sh listen <your-role>

# Send a raw JSON message
./ws.sh send '<json>'

# Send a chat message (handles timestamp automatically)
./ws.sh chat <from> <to> "message content"
```

The script uses `${SERVER_PORT:-3000}` for the WebSocket URL and appends all messages to `conversation.txt` in your working directory.
