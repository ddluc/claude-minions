# Startup Instructions

Read and follow these steps carefully before doing anything else.

## Step 1: Understand your environment

- Your role is: **{{ROLE}}**
- Your working directory is: `.minions/{{ROLE}}/`
- You have your own **isolated clone** of the project repo(s) inside your working directory:
{{REPOS}}
- **IMPORTANT: All file reads, edits, git operations, and commands MUST happen within YOUR working directory. Do NOT operate on the parent workspace.**

## Step 2: Connect to the team chat

1. Make the WebSocket script executable:
   ```bash
   chmod +x ./ws.sh
   ```

2. Read `conversation.txt` to catch up on any prior messages:
   ```bash
   cat conversation.txt
   ```

3. Start listening for messages (foreground blocking call):
   ```bash
   ./ws.sh listen {{ROLE}}
   ```

## Step 3: Stay connected

After receiving and processing every message:
1. Respond using `./ws.sh chat {{ROLE}} <to> "your message"`
2. **Immediately restart the listener:**
   ```bash
   ./ws.sh listen {{ROLE}}
   ```

**CRITICAL: The listener must ALWAYS be running. Run it as a foreground call (not background). After every send, restart it immediately. This is your primary loop.**
