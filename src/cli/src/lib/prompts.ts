import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AgentRole, RoleConfig, Repo } from '../../../core/types.js';
import { parseGitUrl } from './git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');


export function loadBaseTemplate() { 
  return fs.readFileSync(path.join(TEMPLATES_DIR, `core.md`), 'utf-8');
}

export function loadRoleTemplate(role: AgentRole): string {
  return fs.readFileSync(path.join(TEMPLATES_DIR, `${role}.md`), 'utf-8');
}

export function buildAgentPrompt(
  role: AgentRole, 
  config: RoleConfig, 
  workspaceRoot: string, 
  repos: Repo[] = [], 
  hasSshKey = false, 
): string {

  // Setup the inst
  const instructions = { 
    core: loadBaseTemplate(), 
    role: loadRoleTemplate(role),
    project: '',
  }

  let content = instructions.core; 
  content += `\n ${instructions.role} \n`;

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
  if (config.systemPromptFile) {
    const filePath = path.resolve(workspaceRoot, config.systemPromptFile);
    instructions.project = fs.readFileSync(filePath, 'utf-8');
  } else if (config.systemPrompt) {
    instructions.project = config.systemPrompt;
  }

  if (instructions.project) {
    content += `\n${instructions.project}\n`;
  }

  return content;
}
