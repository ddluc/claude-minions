import { describe, it, expect } from 'vitest';
import { buildAgentPrompt } from '../prompts.js';

describe('buildAgentPrompt', () => {
  const role = 'be-engineer' as const;
  const config = { model: 'sonnet' as const };
  const workspaceRoot = '/workspace/project';
  const roleDir = '/workspace/project/.minions/be-engineer';

  it('includes the role prompt content', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot);
    expect(result).toContain('Backend Engineer');
  });

  it('appends working directory section with concrete paths when roleDir is provided', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot, [], false, roleDir);
    expect(result).toContain(`\`${roleDir}\``);
    expect(result).toContain(`\`${workspaceRoot}\``);
  });

  it('does not append working directory section when roleDir is not provided', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot);
    expect(result).not.toContain('{{WORKING_DIR}}');
    expect(result).not.toContain('Your working directory');
  });

  it('appends SSH section when hasSshKey is true', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot, [], true);
    expect(result).toContain('SSH Authentication');
  });

  it('does not append SSH section when hasSshKey is false', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot, [], false);
    expect(result).not.toContain('SSH Authentication');
  });

  it('appends repository context when repos are provided', () => {
    const repos = [{ name: 'my-repo', url: 'https://github.com/owner/my-repo', path: 'my-repo' }];
    const result = buildAgentPrompt(role, config, workspaceRoot, repos);
    expect(result).toContain('Repository Context');
    expect(result).toContain('owner/my-repo');
  });

  it('does not append repository context when no repos provided', () => {
    const result = buildAgentPrompt(role, config, workspaceRoot);
    expect(result).not.toContain('Repository Context');
  });
});
