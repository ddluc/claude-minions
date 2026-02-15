import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_PORT } from '../../../core/constants.js';
import type { AgentRole, RoleConfig } from '../../../core/types.js';

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

export function buildClaudeMd(role: AgentRole, config: RoleConfig, workspaceRoot: string): string {
  const base = loadRoleTemplate(role);
  let projectInstructions = '';

  if (config.systemPromptFile) {
    const filePath = path.resolve(workspaceRoot, config.systemPromptFile);
    projectInstructions = fs.readFileSync(filePath, 'utf-8');
  } else if (config.systemPrompt) {
    projectInstructions = config.systemPrompt;
  }

  if (projectInstructions) {
    return base + '\n' + projectInstructions + '\n';
  }
  return base;
}
