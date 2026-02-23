import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AgentRole, RoleConfig, Repo } from '../../core/types.js';
import { PERSONALITY_TAGS } from '../../core/constants.js';
import { parseGitUrl } from './git.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

// Delimiters separating sections in core.md: working directory, ssh, repository context
const CORE_SECTION_DELIMITER = '\n---\n';

/**
 * Load the role-specific prompt markdown file (e.g. cao.md, pm.md).
 */
export function loadAgentPrompt(role: AgentRole): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, `${role}.md`), 'utf-8');
}

/**
 * Load core.md and split it into three sections: working directory, SSH, and repository context.
 */
function loadCoreSections(): [string, string, string] {
  const core = fs.readFileSync(path.join(PROMPTS_DIR, 'core.md'), 'utf-8');
  const [workingDir = '', ssh = '', repo = ''] = core.split(CORE_SECTION_DELIMITER);
  return [workingDir.trim(), ssh.trim(), repo.trim()];
}

/**
 * Assemble the full CLAUDE.md prompt for a role by combining the role template,
 * personality traits, working directory, SSH config, repos, and project-specific instructions.
 */
export function buildAgentPrompt(role: AgentRole, config: RoleConfig, workspaceRoot: string, repos: Repo[] = [], hasSshKey = false, roleDir?: string): string {
  const [workingDirSection, sshSection, repoSection] = loadCoreSections();
  let content = loadAgentPrompt(role);

  if (config.personality && config.personality.length > 0) {
    const traits = config.personality
      .filter(tag => tag in PERSONALITY_TAGS)
      .map(tag => `- ${PERSONALITY_TAGS[tag]}`);

    if (traits.length > 0) {
      content += '\n\n## Personality\n\n';
      content += 'These traits define how you communicate — not how you think or work. ';
      content += 'Your work quality, reasoning, and technical decisions are unaffected.\n\n';
      content += traits.join('\n') + '\n';
    }
  }

  if (roleDir) {
    content += '\n\n' + workingDirSection
      .replace('{{WORKING_DIR}}', roleDir)
      .replace('{{WORKSPACE_ROOT}}', workspaceRoot);
  }

  if (hasSshKey) {
    content += '\n\n' + sshSection;
  }

  if (repos.length > 0) {
    const repoLines = repos.map(r => {
      try {
        const { owner, repo } = parseGitUrl(r.url);
        return `- **${r.name}**: \`${owner}/${repo}\` (path: \`${r.path}/\`)`;
      } catch {
        return `- **${r.name}**: \`${r.url}\` (path: \`${r.path}/\`)`;
      }
    }).join('\n');

    content += '\n\n' + repoSection.replace('{{REPO_LIST}}', repoLines);
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
