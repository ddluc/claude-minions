import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_PORT } from '../../../core/constants.js';
import type { AgentRole, RoleConfig, Repo } from '../../../core/types.js';
import { parseGitUrl } from './git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export function generateConnectMd(port: number = DEFAULT_PORT): string {
  return `
# Minions Server Connection

Server URL: ws://localhost:${port}
API URL: http://localhost:${port}

## EC2 Setup
When running on EC2, update to:
Server URL: wss://<your-ec2-host>:${port}
API URL: https://<your-ec2-host>:${port}
`;
}

export function loadRoleTemplate(role: AgentRole): string {
  return fs.readFileSync(path.join(TEMPLATES_DIR, `${role}.md`), 'utf-8');
}

export function buildClaudeMd(role: AgentRole, config: RoleConfig, workspaceRoot: string, repos: Repo[] = [], hasSshKey = false, serverPort?: number): string {
  const base = loadRoleTemplate(role);
  let content = base;

  // Inject WebSocket communication script if server port is configured
  if (serverPort) {
    content += `
## WebSocket Communication

This minion communicates with other agents via a WebSocket server. Use the following bash functions to listen for and send messages.

### Listening for Messages

Run \`ws_listen\` to connect to the server and wait for incoming messages:

\`\`\`bash
#!/bin/bash
MINION_ROLE="\${MINION_ROLE:-${role}}"
WS_URL="ws://localhost:${serverPort}/ws/\${MINION_ROLE}"

ws_listen() {
  echo "Connecting to \${WS_URL}..."
  websocat "\${WS_URL}" | while read -r msg; do
    echo "New message: \${msg}"
  done
}
\`\`\`

### Sending Messages

Use \`ws_send\` to send messages back to the server:

\`\`\`bash
ws_send() {
  local message="$1"
  echo "\${message}" | websocat "\${WS_URL}"
}
\`\`\`

### Instructions
- After completing each task, run: \`ws_listen\` to resume monitoring
- To send a message: \`ws_send '{"type":"chat","from":"${role}","to":"cao","content":"your message","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'\`

`;
  }

  // Inject SSH authentication info if SSH key is configured
  if (hasSshKey) {
    content += `\n## SSH Authentication\n\nAn SSH key is available at \`ssh_key\` in your working directory. Each repository has been pre-configured with \`git config core.sshCommand\` to use this key automatically.\n\n**You do NOT need to manually configure SSH** - all git operations within repository directories will authenticate automatically.\n\n`;
  }

  // Inject repository context so agents know owner/repo for gh commands
  if (repos.length > 0) {
    const repoLines = repos.map(r => {
      try {
        const { owner, repo } = parseGitUrl(r.url);
        return `- **${r.name}**: \`${owner}/${repo}\` (path: \`${r.path}/\`)`;
      } catch {
        return `- **${r.name}**: \`${r.url}\` (path: \`${r.path}/\`)`;
      }
    }).join('\n');

    content += `\n## Repository Context\n\nYour accessible repositories:\n${repoLines}\n\nUse \`-R owner/repo\` with \`gh\` commands to target specific repos.\n`;
  }

  // Append project-specific instructions
  let projectInstructions = '';
  if (config.systemPromptFile) {
    const filePath = path.resolve(workspaceRoot, config.systemPromptFile);
    projectInstructions = fs.readFileSync(filePath, 'utf-8');
  } else if (config.systemPrompt) {
    projectInstructions = config.systemPrompt;
  }

  if (projectInstructions) {
    content += '\n' + projectInstructions + '\n';
  }

  return content;
}
